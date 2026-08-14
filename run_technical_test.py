"""One-off script: runs the 35-query technical test set against the live
server, logging retrieval + response + timing for Chapter 4.2.2 / 4.2.3."""

import csv
import json
import time
import urllib.request

from rag import get_store

TEST_QUERIES = [
    ("When does the new semester begin?", "academic_calendar"),
    ("what date does skul resume", "academic_calendar"),
    ("Is there a break before exams start?", "academic_calendar"),
    ("when's resumption for 200 level", "academic_calendar"),
    ("Can you tell me the academic calendar for this session?", "academic_calendar"),
    ("wen does d semester end", "academic_calendar"),
    ("Are lectures starting this week or next?", "academic_calendar"),
    ("what's the schedule for the first semester", "academic_calendar"),
    ("How do I register my courses this semester?", "course_registration"),
    ("wen is d last day to register courses", "course_registration"),
    ("What is the process for adding a course after registration closes?", "course_registration"),
    ("how do i register for csc courses", "course_registration"),
    ("Can I still register if I missed the deadline?", "course_registration"),
    ("wat do i need to complete course registration", "course_registration"),
    ("Is course registration done online or in person?", "course_registration"),
    ("i havent registered yet wat should i do", "course_registration"),
    ("registration process pls", "course_registration"),
    ("How do I pay my school fees?", "fee_payment"),
    ("wen is d fee payment deadline", "fee_payment"),
    ("What happens if I pay my fees late?", "fee_payment"),
    ("how much are skool fees this session", "fee_payment"),
    ("can i pay fees in installments", "fee_payment"),
    ("wia do i go to pay fees", "fee_payment"),
    ("i missed d fee deadline can i still register for exams", "fee_payment"),
    ("is there a fee payment portal", "fee_payment"),
    ("skool fees for 300 level pls", "fee_payment"),
    ("When are the exams starting?", "examination_schedule"),
    ("wen's d exam timetable out", "examination_schedule"),
    ("What is the venue for my exams?", "examination_schedule"),
    ("how do i check my exam schedule", "examination_schedule"),
    ("can i still register for exams if i havent paid fees", "examination_schedule"),
    ("wen is d next exam", "examination_schedule"),
    ("is the exam timetable out yet", "examination_schedule"),
    ("i need info on exam venue and time", "examination_schedule"),
    ("wat exams do i have this week", "examination_schedule"),
]

store = get_store()
results = []

for i, (query, expected_category) in enumerate(TEST_QUERIES, start=1):
    retrieved = store.search(query, top_k=3)
    top_tag = retrieved[0]["metadata"].get("tag") if retrieved else None
    top_score = round(retrieved[0]["score"], 3) if retrieved else 0
    retrieval_correct = top_tag == expected_category

    payload = json.dumps({"message": query}).encode()
    req = urllib.request.Request(
        "http://localhost:5000/chat", data=payload, headers={"Content-Type": "application/json"}
    )
    start = time.time()
    with urllib.request.urlopen(req, timeout=30) as resp:
        reply = json.loads(resp.read())["reply"]
    elapsed = round(time.time() - start, 2)

    results.append({
        "#": i,
        "query": query,
        "expected_category": expected_category,
        "top_retrieved_tag": top_tag,
        "similarity_score": top_score,
        "retrieval_correct": retrieval_correct,
        "response_time_s": elapsed,
        "reply": reply,
    })
    print(f"{i}/35  retrieval={'OK' if retrieval_correct else 'MISS'}  score={top_score}  time={elapsed}s  -> {query}")

with open("technical_test_results.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=list(results[0].keys()))
    writer.writeheader()
    writer.writerows(results)

correct_retrievals = sum(1 for r in results if r["retrieval_correct"])
times = [r["response_time_s"] for r in results]
print()
print(f"Retrieval accuracy: {correct_retrievals}/{len(results)} = {correct_retrievals/len(results)*100:.1f}%")
print(f"Avg response time: {sum(times)/len(times):.2f}s  min={min(times):.2f}s  max={max(times):.2f}s")
