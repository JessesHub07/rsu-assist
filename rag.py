"""
Retrieval layer for the RSU chatbot.

Two document sources are embedded into one shared vector index:
  1. The curated knowledge_base.json (verified RSU facts)
  2. Text chunks extracted from PDFs students upload

At query time we embed the question, pull the top-k most similar chunks
from whichever sources are relevant, and hand that context to Claude to
generate the actual reply (see llm.py).
"""

import json
import os
import pickle

import numpy as np
from sentence_transformers import SentenceTransformer

EMBED_MODEL_NAME = "all-MiniLM-L6-v2"
VECTOR_STORE_DIR = os.path.join(os.path.dirname(__file__), "vector_store")
INDEX_PATH = os.path.join(VECTOR_STORE_DIR, "index.pkl")
KB_PATH = os.path.join(os.path.dirname(__file__), "data", "knowledge_base.json")

CHUNK_SIZE = 800
CHUNK_OVERLAP = 150


def is_visible(chunk_department, chunk_level, viewer_department, viewer_level):
    """Shared visibility rule: general content (no department) is visible to
    anyone; department-scoped content requires a matching department, and
    either applies to all levels there or must match the viewer's level.
    Used both for chat retrieval and for the browsable FAQ list, so the two
    stay in sync."""
    if chunk_department is None:
        return True
    if viewer_department is None or chunk_department != viewer_department:
        return False
    if chunk_level in (None, "all"):
        return True
    return chunk_level == viewer_level


def chunk_text(text, chunk_size=CHUNK_SIZE, overlap=CHUNK_OVERLAP):
    text = " ".join(text.split())
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start = end - overlap
    return [c for c in chunks if c.strip()]


class VectorStore:
    def __init__(self):
        self._model = None
        self.texts = []
        self.metadatas = []
        self.embeddings = None  # shape (n, dim)
        self._load()

    @property
    def model(self):
        if self._model is None:
            self._model = SentenceTransformer(EMBED_MODEL_NAME)
        return self._model

    def _load(self):
        if os.path.exists(INDEX_PATH):
            with open(INDEX_PATH, "rb") as f:
                data = pickle.load(f)
            self.texts = data["texts"]
            self.metadatas = data["metadatas"]
            self.embeddings = data["embeddings"]
        else:
            self._seed_from_knowledge_base()

    def _save(self):
        os.makedirs(VECTOR_STORE_DIR, exist_ok=True)
        with open(INDEX_PATH, "wb") as f:
            pickle.dump(
                {"texts": self.texts, "metadatas": self.metadatas, "embeddings": self.embeddings},
                f,
            )

    def _seed_from_knowledge_base(self):
        """Turn each KB intent into retrievable documents, so structured
        facts and uploaded-PDF chunks are searched the exact same way.

        Each intent may carry a `department` and `level`:
          - department: None/omitted means the content applies to anyone
            (general RSU info); a value like "Computer Engineering" scopes
            it to students confirmed in that department.
          - level: None/"all" means it applies to every level within that
            department; a specific level (100-500) scopes it further.
        """
        if not os.path.exists(KB_PATH):
            return
        with open(KB_PATH, encoding="utf-8") as f:
            kb = json.load(f)
        texts, metadatas = [], []
        for intent in kb.get("intents", []):
            tag = intent.get("tag", "unknown")
            department = intent.get("department")
            level = intent.get("level")
            responses = " ".join(intent.get("responses", []))
            for pattern in intent.get("patterns", []):
                texts.append(f"{pattern} {responses}")
                metadatas.append({
                    "source": "knowledge_base",
                    "tag": tag,
                    "department": department,
                    "level": level,
                })
        if texts:
            self.add_documents(texts, metadatas, persist=False)
        self._save()

    def add_documents(self, texts, metadatas, persist=True):
        if not texts:
            return
        new_embeddings = self.model.encode(texts, normalize_embeddings=True)
        self.texts.extend(texts)
        self.metadatas.extend(metadatas)
        if self.embeddings is None or len(self.embeddings) == 0:
            self.embeddings = np.array(new_embeddings)
        else:
            self.embeddings = np.vstack([self.embeddings, new_embeddings])
        if persist:
            self._save()

    def add_pdf(self, filename, full_text, user_id=None):
        chunks = chunk_text(full_text)
        metadatas = [{"source": "document", "filename": filename, "user_id": user_id} for _ in chunks]
        self.add_documents(chunks, metadatas)
        return len(chunks)

    def _is_visible(self, metadata, department, level, user_id):
        """Uploaded documents are private study material: a chunk from a
        document is only visible to the student who uploaded it. Knowledge
        base content keeps the existing department/level rule."""
        if metadata.get("source") == "document":
            return metadata.get("user_id") is not None and metadata.get("user_id") == user_id
        return is_visible(metadata.get("department"), metadata.get("level"), department, level)

    def search(self, query, top_k=4, min_score=0.25, department=None, level=None, user_id=None):
        if self.embeddings is None or len(self.embeddings) == 0:
            return []
        query_vec = self.model.encode([query], normalize_embeddings=True)[0]
        scores = self.embeddings @ query_vec  # cosine similarity (vectors are normalized)
        order = np.argsort(scores)[::-1]

        results = []
        for i in order:
            if scores[i] < min_score:
                break  # scores are sorted descending, nothing further will pass
            if not self._is_visible(self.metadatas[i], department, level, user_id):
                continue
            results.append(
                {"text": self.texts[i], "metadata": self.metadatas[i], "score": float(scores[i])}
            )
            if len(results) >= top_k:
                break
        return results


_store = None


def get_store():
    global _store
    if _store is None:
        _store = VectorStore()
    return _store
