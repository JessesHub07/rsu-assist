"""Seeds mock Computer Engineering students for demo purposes.

Levels are set via level_override rather than left to the naive admission-year
calculation, since real cohorts are frequently delayed by ASUU strikes, an
override is exactly how that gets corrected in practice.
"""

from storage import create_student, init_db, get_conn

DEPARTMENT = "Computer Engineering"
DEFAULT_PASSWORD = "Password123!"

STUDENTS = [
    ("U2020/CPE/001", "Chukwuemeka Obi", "chukwuemeka.obi@stu.rsu.edu.ng", 2020, 300),
    ("U2020/CPE/002", "Aisha Bello", "aisha.bello@stu.rsu.edu.ng", 2020, 300),
    ("U2021/CPE/010", "Oluwaseun Adebayo", "oluwaseun.adebayo@stu.rsu.edu.ng", 2021, 300),
    ("U2021/CPE/011", "Ngozi Eze", "ngozi.eze@stu.rsu.edu.ng", 2021, 200),
    ("U2022/CPE/018", "Ibrahim Musa", "ibrahim.musa@stu.rsu.edu.ng", 2022, 200),
    ("U2022/CPE/019", "Blessing Okafor", "blessing.okafor@stu.rsu.edu.ng", 2022, 200),
    ("U2023/CPE/025", "Yusuf Abdullahi", "yusuf.abdullahi@stu.rsu.edu.ng", 2023, 100),
    ("U2023/CPE/026", "Chiamaka Nwankwo", "chiamaka.nwankwo@stu.rsu.edu.ng", 2023, 100),
    ("U2019/CPE/005", "Tobi Ogundipe", "tobi.ogundipe@stu.rsu.edu.ng", 2019, 400),
    ("U2019/CPE/006", "Amaka Chukwu", "amaka.chukwu@stu.rsu.edu.ng", 2019, 400),
    ("U2018/CPE/002", "Musa Ibrahim Garba", "musa.garba@stu.rsu.edu.ng", 2018, 500),
    ("U2018/CPE/003", "Precious Etim", "precious.etim@stu.rsu.edu.ng", 2018, 500),
    ("De.2021/5618", "Omoghene Princess", "yugbovwreomoghene@gmail.com", 2021, 500),
]


def main():
    init_db()
    conn = get_conn()
    existing = {r["matric_number"] for r in conn.execute(
        "SELECT matric_number FROM users WHERE matric_number IS NOT NULL"
    ).fetchall()}
    conn.close()

    created = 0
    for matric, name, email, admission_year, level in STUDENTS:
        if matric in existing:
            continue
        # No password set here, that's the real-world flow: the department
        # provides the roster, the student sets their own password by
        # signing up with their matric number the first time.
        create_student(matric, name, email, DEPARTMENT, admission_year)
        conn = get_conn()
        conn.execute(
            "UPDATE users SET level_override = ? WHERE matric_number = ?", (level, matric)
        )
        conn.commit()
        conn.close()
        created += 1

    print(f"Seeded {created} new students (skipped {len(STUDENTS) - created} already present).")
    print("These accounts have no password yet, each student sets one via Sign Up on first login.")


if __name__ == "__main__":
    main()
