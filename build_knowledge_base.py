"""
Generates data/knowledge_base.json from the real Computer Engineering
department content (FAQ, Academic Information, Departmental Information).

Run this once whenever the source content changes:
    python build_knowledge_base.py
"""

import json

DEPT = "Computer Engineering"

intents = []


def general(tag, patterns, responses, category=None, faq=True):
    intents.append({"tag": tag, "department": None, "level": None, "category": category,
                     "faq": faq, "patterns": patterns, "responses": responses})


def dept_wide(tag, patterns, responses, category):
    intents.append({"tag": tag, "department": DEPT, "level": "all", "category": category,
                     "faq": True, "patterns": patterns, "responses": responses})


def level_specific(tag, level, patterns, responses, category):
    intents.append({"tag": tag, "department": DEPT, "level": level, "category": category,
                     "faq": True, "patterns": patterns, "responses": responses})


# ---------------------------------------------------------------------------
# General (visible to everyone, students and public visitors alike).
# These are conversational utility intents, not real FAQ content, so they're
# excluded from the browsable FAQ list (faq=False).
# ---------------------------------------------------------------------------

general("greeting", ["hello", "hi", "hey", "good morning", "good afternoon"],
        ["Hello! How can I help you with RSU student information today?"], faq=False)

general("farewell", ["bye", "goodbye", "thanks, bye", "see you"],
        ["You're welcome! Feel free to come back if you have more questions."], faq=False)

general("fallback", [],
        ["I don't have verified information on that yet. Please contact the ICT unit or Student Affairs office for help."], faq=False)

# ---------------------------------------------------------------------------
# Department-wide (any Computer Engineering student, any level)
# ---------------------------------------------------------------------------

CAT_ABOUT = "About the Department"
CAT_COURSES = "Courses & Curriculum"
CAT_EXAMS = "Registration & Exams"
CAT_SIWES = "SIWES & Final Year Project"
CAT_GRAD = "Graduation"

dept_wide("hod_info",
    ["who is the HOD", "who is the head of department", "who is the current HOD of Computer Engineering", "hod name"],
    ["The current (Acting) Head of the Computer Engineering Department is Engr. Dr. Boma J. Luckyn, Senior Lecturer, specializing in Information Technology, in office since May 2025."], CAT_ABOUT)

dept_wide("past_hods",
    ["who were the past HODs", "previous heads of department", "history of HODs"],
    ["Past Heads of Department: Engr. Dr. Frank E. Ekpar (Feb 2024 - 2025, Reader, System Science and Engineering), Engr. Dr. Promise Elechi (Mar 2022 - Feb 2024, Senior Lecturer, Electronics & Telecommunication Engineering), Engr. Dr. Sunny Orike (2018 - Mar 2022, Reader, Artificial Intelligence)."], CAT_ABOUT)

dept_wide("courses_offered_overview",
    ["what courses are offered in Computer Engineering", "what will I be studying", "course overview"],
    ["The programme includes courses in programming, digital electronics, computer architecture, microprocessors, embedded systems, control systems, communication systems, computer networks, software engineering, operating systems, signal processing, mathematics, engineering sciences, and other core engineering subjects. The exact course list depends on your level and the approved curriculum, ask about a specific level for the full list."], CAT_COURSES)

dept_wide("compeng_vs_compsci",
    ["difference between Computer Engineering and Computer Science", "is CPE the same as CSC", "Computer Engineering vs Computer Science at RSU"],
    ["At Rivers State University, although both programmes involve programming and computing concepts, Computer Engineering is offered under the Faculty of Engineering and combines engineering principles with computer hardware and software. Computer Science is offered under the Faculty of Science and focuses more on software development, computation, algorithms, databases, and information systems."], CAT_ABOUT)

dept_wide("department_location",
    ["where is the Computer Engineering department located", "department office location", "where is the department"],
    ["The Computer Engineering Department is located within the Faculty of Engineering Building at Rivers State University, Nkpolu-Oroworukwo, PMB 5080, Port Harcourt."], CAT_ABOUT)

dept_wide("office_hours",
    ["what are the department office hours", "when is the department open", "office hours"],
    ["The Computer Engineering Department is open from 8:00 a.m. to 4:00 p.m., Monday to Friday, during official working days."], CAT_ABOUT)

dept_wide("about_department",
    ["tell me about the Computer Engineering department", "what is the department about", "department overview"],
    ["The Department of Computer Engineering offers a Bachelor of Technology (B.Tech.) degree programme. During the first two years, all departments in the Faculty of Engineering follow a common curriculum focused on basic science and fundamental engineering courses. From year three onward, students take specialized Computer Engineering coursework (Design, Mathematics, Numerical Methods, Computing). Students also complete the equivalent of one year of industrial experience, spread across four years, to build professionalism and industry readiness."], CAT_ABOUT)

dept_wide("vision_mission",
    ["what is the department's vision", "what is the department's mission", "vision and mission"],
    ["VISION: To establish an exceptional and leading department that will be structurally and philosophically oriented to solve practical and peculiar challenging problems of mankind using Computer Engineering, its applications and developments. MISSION: To produce high quality computer engineers equipped with sound research and practical ability in analysis, design, development and maintenance of computer systems and applications that support human civilization."], CAT_ABOUT)

dept_wide("programme_philosophy",
    ["what is the programme philosophy", "philosophy of the Computer Engineering degree"],
    ["The philosophy of the Computer Engineering degree programme is to provide students with a comprehensive and stimulating education in Computer Engineering and its sub-fields, equipping them with the technical expertise and foundational knowledge needed to contribute meaningfully to technological advancements in Nigeria, Africa, and the global community."], CAT_ABOUT)

dept_wide("labs_facilities",
    ["what laboratories does the department have", "what facilities are available", "labs"],
    ["The department utilises several laboratories for practical sessions: Measurement Laboratory, Electronics Lab, Microprocessor / Process Control / Instrumentation and Embedded Systems Lab, Software Lab, Telecommunication Lab, Machine Lab, and Virtual Lab."], CAT_ABOUT)

dept_wide("academic_staff",
    ["who are the lecturers", "list of academic staff", "who teaches in Computer Engineering"],
    ["Full-time departmental academic staff include Engr. Prof. S. Orike (Artificial Intelligence), Engr. Dr. F. E. Ekpar (AI and Biomedical Engineering), Engr. Dr. P. Elechi (Electronics & Telecommunication), Engr. Dr. B. J. Luckyn (Information Technology), Engr. Dr. M. O. Nwoku (Expert Systems), Engr. Dr. R. T. Sibe (Cybersecurity/Digital Forensics), Engr. Dr. J. D. Enoch (Data Communication, Info. Systems & Software Eng.), Engr. Dr. T. J. Alalibo (Network Security), Engr. Dr. M. Franklin (Informatics, Emerging Tech.), Engr. W. N. Abidde, Engr. N. Eyidia, Engr. R. C. Kwelle, and Mr. E. S. J. Eme. Service courses in Electrical & Electronics Engineering are shared with staff from that department."], CAT_ABOUT)

dept_wide("registration_procedure",
    ["how do I register my courses", "course registration procedure", "how to register for courses", "steps to register courses"],
    ["To register: log into your portal on the RSU website, click the menu bar, select 'Course Registration' (or 'Register your courses'), then tap on all the courses you have for that semester. Full-time students register a minimum of 15 and maximum of 24 credit units per semester (exceptions: minimum 9 units for spill-over students; maximum 30 units for Year 5 students with CGPA of 2.00 or higher). Concurrent enrolment in another programme is not permitted."], CAT_EXAMS)

dept_wide("examination_rules",
    ["how is my grade calculated", "examination rules", "what percentage is continuous assessment", "exam duration", "resit exams"],
    ["Continuous assessment counts for 30% of your grade and the final exam for 70%. Final exams do not normally exceed 3 hours. There are no re-sit or supplementary examinations. Students must maintain at least 75% attendance to be eligible to sit exams. Examination malpractice is taken seriously: unauthorized materials in the exam hall can lead to a 1-session suspension, impersonation leads to dismissal (and police referral for non-students), and having a phone in the exam hall results in an automatic 'F' in that course."], CAT_EXAMS)

dept_wide("grading_scale",
    ["what is the grading scale", "how is GPA computed", "what is a passing grade"],
    ["Grading scale: A (70-100, 5 points), B (60-69, 4 points), C (50-59, 3 points), D (45-49, 2 points), E (40-44, 1 point), F (0-39, 0 points). GPA is calculated as the sum of (Grade Point x Units) divided by total units attempted in the semester; CGPA is the cumulative version across all semesters."], CAT_EXAMS)

dept_wide("siwes_info",
    ["what is SIWES", "SIWES requirements", "industrial training requirements"],
    ["SIWES (Students' Industrial Work Experience Scheme) is completed through FEC 402 in Year 4, Second Semester, 15 units, and it is a stand-alone course that must not be registered alongside any other course. It builds on SWEP done earlier: FEC 202 (end of Year 2) and FEC 302 (end of Year 3), both 0 credit units but compulsory, their logbooks feed into the final FEC 402 grade. SIWES completion is a compulsory graduation requirement."], CAT_SIWES)

dept_wide("final_year_project_info",
    ["what is the final year project about", "how does the final year project work", "project seminar requirements"],
    ["The final year project has two components: CEN 581 Project Seminar (2 units), where students present research or industrial topics to develop presentation and technical reporting skills; and CEN 582 Final Year Project (6 units), an individual project with a topic chosen from a departmental list or proposed by the student in consultation with a project adviser. A written report is submitted and defended before a Board of Examiners."], CAT_SIWES)

dept_wide("graduation_requirements",
    ["what are the graduation requirements", "how do I graduate", "requirements to graduate"],
    ["To graduate you must: pass all core, required, and elective courses with a minimum CGPA of 1.00; complete all classwork, SIWES, seminars, and the final year project; pass a minimum of 201 credit units for the 5-year programme (167 units for Direct Entry into Year 2, 121 units for Direct Entry into Year 3, minimum load per semester is 15 units); Direct Entry students must also audit and pass 100-level university-required courses; and be found worthy in both character and learning. Note: students who complete the programme in their 8th year (16 semesters) are eligible only for a Pass degree, regardless of CGPA."], CAT_GRAD)

dept_wide("degree_classification",
    ["how is my degree class determined", "CGPA for first class", "degree classification"],
    ["Degree classification by CGPA: First Class (4.50-5.00), Second Class Upper (3.50-4.49), Second Class Lower (2.40-3.49), Third Class (1.50-2.39), Pass (1.00-1.49), Fail (0.00-0.99)."], CAT_GRAD)

dept_wide("academic_calendar_key_dates",
    ["when does the semester start", "when is resumption", "academic calendar", "when does school resume", "when does the session end", "convocation date"],
    ["Key dates for the 2025/2026 academic session: Resumption and online registration begins Monday 3rd November 2025. First semester lectures begin Monday 10th November 2025. 37th/38th Combined Convocation Ceremony: Friday 5th - Saturday 6th December 2025. Christmas break: Saturday 20th December 2025 - Saturday 3rd January 2026. Matriculation Ceremony: Wednesday 28th January 2026. Second semester lectures run Monday 6th April - Friday 26th June 2026. Students' Week: Monday 8th - Saturday 13th June 2026. 2025/2026 session ends Friday 25th September 2026. This calendar was approved by the Senate at its 324th Regular Meeting (30th October 2025) and circulated by the Registrar, Ref RSU/REG/4/S.9/VOL.4/158, dated 12th November 2025."], CAT_EXAMS)

# ---------------------------------------------------------------------------
# Level-specific: course lists (Year N, both semesters)
# ---------------------------------------------------------------------------

level_specific("courses_100_first", 100,
    ["what courses am I taking in 100 level first semester", "100L first semester courses", "year 1 first semester courses"],
    ["Year 1, First Semester courses (19 units total): GST 141 Use of English I (2), GST 147 Use of Library Skills and ICT (2), GST 150 Philosophy and Logic (2), MTH 105 Engineering Mathematics I (3), PHY 103 General Physics Laboratory I (1), PHY 105 General Physics I (3), CHS 101 General Chemistry I (3), CHS 107 General Chemistry Laboratory I (1), FEC 121 Technical Drawing I (2)."], CAT_COURSES)

level_specific("courses_100_second", 100,
    ["what courses am I taking in 100 level second semester", "100L second semester courses", "year 1 second semester courses"],
    ["Year 1, Second Semester courses (17 units total): GST 112 Man and Society II (2), GST 142 Use of English II (2), MTH 106 Engineering Mathematics II (3), PHY 104 General Physics Laboratory II (1), PHY 106 General Physics II (3), CHS 102 General Chemistry II (3), CHS 108 General Chemistry Laboratory II (1), FEC 122 Technical Drawing II (2)."], CAT_COURSES)

level_specific("courses_200_first", 200,
    ["what courses am I taking in 200 level first semester", "200L first semester courses", "year 2 first semester courses"],
    ["Year 2, First Semester courses (23 units total): MTH 205 Engineering Mathematics III (3), EDC 211 Introduction to Entrepreneurship Studies (2), FEC 221 Strength of Materials I (3), FEC 231 Electrical Technology (3), FEC 251 Engineering Drawing (2), FEC 253 Thermodynamics I (3), FEC 255 Applied Mechanics I (3), FEC 257 Workshop Technology I (3)."], CAT_COURSES)

level_specific("courses_200_second", 200,
    ["what courses am I taking in 200 level second semester", "200L second semester courses", "year 2 second semester courses"],
    ["Year 2, Second Semester courses (23 units total): MTH 206 Engineering Mathematics IV (3), GST 222 Peace and Conflict Resolution (2), FEC 222 Fluid Mechanics (3), FEC 254 Introduction to Engineering Practice (2), FEC 256 Material Science (3), EEE 202 Electric Circuit Theory I (3), EEE 204 Electrical Workshop Technology (1), EEE 232 Basic Electronics (3), EEE 262 Principles of Power Engineering (3). Plus, during the long vacation: FEC 202 Students' Work Experience Programme (SWEP), 0 units but compulsory for graduation, its logbook feeds into the FEC 402 SIWES grade in Year 4."], CAT_COURSES)

level_specific("courses_300_first", 300,
    ["what courses am I taking in 300 level first semester", "300L first semester courses", "year 3 first semester courses"],
    ["Year 3, First Semester courses (22 units total): MTH 305 Engineering Mathematics V (3), CMS 200 Computer Application and Programming (3), EEE 311 Electrical Measurement I (2), EEE 331 Electronic Devices (3), EEE 351 Electrical Machines I (3), CEN 331 Analogue Electronic Circuit (2), CEN 351 Computer Organisation and Architecture (3), CEN 361 Software Development Techniques (2), CEN 371 Computer Engineering Laboratory I (1)."], CAT_COURSES)

level_specific("courses_300_second", 300,
    ["what courses am I taking in 300 level second semester", "300L second semester courses", "year 3 second semester courses"],
    ["Year 3, Second Semester courses (21 units total): MTH 306 Engineering Mathematics VI (3), EDC 310 Entrepreneurial Practice (2), EEE 342 Electromagnetic Fields and Waves (3), EEE 344 Telecommunications Principles (3), CEN 302 Numerical Computation (3), CEN 362 Introduction to Artificial Intelligence (3), CEN 364 Data Structure and Algorithm (2), CEN 372 Computer Engineering Laboratory II (1), CEN 374 Computer Engineering Laboratory III (1). Plus, during the long vacation: FEC 302 Students' Work Experience Programme (SWEP), 0 units but compulsory for graduation, its logbook feeds into the FEC 402 SIWES grade in Year 4."], CAT_COURSES)

level_specific("courses_400_first", 400,
    ["what courses am I taking in 400 level first semester", "400L first semester courses", "year 4 first semester courses"],
    ["Year 4, First Semester courses (20 units total): EEE 411 Control Theory I (3), CEN 401 Technical Report Writing (2), CEN 421 Microprocessor System and Interfacing (3), CEN 441 Data Communication and Network (3), CEN 451 Prototyping Techniques (2), CEN 461 Object-Oriented Design and Programming (2), CEN 463 Assembly Language Programming (3), CEN 471 Computer Engineering Laboratory IV (1), CEN 473 Computer Engineering Laboratory V (1)."], CAT_COURSES)

level_specific("courses_400_second", 400,
    ["what courses am I taking in 400 level second semester", "400L second semester courses", "year 4 second semester courses", "SIWES semester"],
    ["Year 4, Second Semester is SIWES: FEC 402 Students' Industrial Work Experience Scheme (15 units, 15 units total). This is a stand-alone course that must not be registered with any other course. Its final grade incorporates the SWEP scores from FEC 202 (Year 2) and FEC 302 (Year 3)."], CAT_COURSES)

level_specific("courses_500_first", 500,
    ["what courses am I taking in 500 level first semester", "500L first semester courses", "year 5 first semester courses", "final year first semester courses"],
    ["Year 5, First Semester courses (21 units total): MEC 561 Engineering Management (3), CEN 501 Reliability and Maintainability (2), CEN 531 Digital Signal Processing (3), CEN 541 Information Security Techniques (2), CEN 561 Cryptography Principles and Applications (2), CEN 563 Computer Graphics and Animation (2), CEN 565 Software Engineering (3), CEN 571 Computer Engineering Laboratory VI (1), CEN 573 Computer Engineering Laboratory VII (1), CEN 581 Seminar (2)."], CAT_COURSES)

level_specific("courses_500_second", 500,
    ["what courses am I taking in 500 level second semester", "500L second semester courses", "year 5 second semester courses", "final year second semester courses"],
    ["Year 5, Second Semester courses (22 units total): LAW 430 Industrial Law and Relations (2), CEN 502 Cyberpreneurship and Cyberlaw (2), CEN 522 Embedded and Real-time Systems Designs (3), CEN 552 Digital System Design with VHDL (3), CEN 562 Robotics and Automation (2), CEN 564 Artificial Neural Networks (2), CEN 572 Computer Engineering Laboratory VIII (1), CEN 574 Computer Engineering Laboratory IX (1), CEN 582 Final Year Project (6)."], CAT_COURSES)

# ---------------------------------------------------------------------------
# Level-specific: examination date windows (2025/2026 session)
# ---------------------------------------------------------------------------

level_specific("exam_dates_100", 100,
    ["when are my exams", "exam timetable for first semester", "when is the exam", "1st year exam dates"],
    ["First Semester 2025/2026 examinations for Year 1 students (CCMAS): Monday 9th - Friday 13th March 2026. Second Semester 2025/2026 examinations for Year 1 students: Monday 20th - Friday 24th July 2026. First Semester 2025/2026 examinations for Years 1, 2 & 3 (BMAS): Monday 23rd - Friday 27th March 2026, and Second Semester equivalent: Monday 3rd - Friday 7th August 2026."], CAT_EXAMS)

level_specific("exam_dates_200", 200,
    ["when are my exams", "exam timetable for first semester", "when is the exam", "2nd year exam dates"],
    ["First Semester 2025/2026 examinations for Year 2 & 3 students: Monday 2nd - Friday 6th March 2026, continuing Monday 16th - Friday 20th March 2026. Second Semester 2025/2026 examinations for Year 2 & 3 students: Monday 13th - Friday 17th July 2026, continuing Monday 27th - Friday 31st July 2026."], CAT_EXAMS)

level_specific("exam_dates_300", 300,
    ["when are my exams", "exam timetable for first semester", "when is the exam", "3rd year exam dates"],
    ["First Semester 2025/2026 examinations for Year 2 & 3 students: Monday 2nd - Friday 6th March 2026, continuing Monday 16th - Friday 20th March 2026. Second Semester 2025/2026 examinations for Year 2 & 3 students: Monday 13th - Friday 17th July 2026, continuing Monday 27th - Friday 31st July 2026."], CAT_EXAMS)

level_specific("exam_dates_400", 400,
    ["when are my exams", "exam timetable for first semester", "when is the exam", "4th year exam dates", "final year exam dates"],
    ["First Semester 2025/2026 examinations for Year 4 & 5 students: Monday 23rd - Friday 27th February 2026. For the Second Semester, note a department-specific correction for Computer Engineering (BMAS): Year 4 & 5 exams begin Monday 24th July 2026 (running to Friday 28th July 2026), starting with final year (Year 5) students first, this supersedes the general university-wide date of Monday 6th - Friday 10th July 2026 for this item. Project Defense (External Examinations): Wednesday 12th - Friday 14th August 2026."], CAT_EXAMS)

level_specific("exam_dates_500", 500,
    ["when are my exams", "exam timetable for first semester", "when is the exam", "5th year exam dates", "final year exam dates"],
    ["First Semester 2025/2026 examinations for Year 4 & 5 students: Monday 23rd - Friday 27th February 2026. For the Second Semester, note a department-specific correction for Computer Engineering (BMAS): Year 4 & 5 exams begin Monday 24th July 2026 (running to Friday 28th July 2026), starting with final year (Year 5) students first, this supersedes the general university-wide date of Monday 6th - Friday 10th July 2026 for this item. Project Defense (External Examinations): Wednesday 12th - Friday 14th August 2026."], CAT_EXAMS)


with open("data/knowledge_base.json", "w", encoding="utf-8") as f:
    json.dump({"intents": intents}, f, indent=2, ensure_ascii=False)

print(f"Wrote {len(intents)} intents to data/knowledge_base.json")
