-- ============================================================
-- SA DTR SYSTEM — PROCUREMENT DEPARTMENT
-- SQLite Schema
-- ============================================================

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- --------------------------------------------------------
-- 1. STUDENT ASSISTANTS
--    One row per registered SA.  department is locked to
--    'Procurement' at the application layer but stored here
--    for future extensibility.
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS student_assistants (
    id              TEXT    PRIMARY KEY,          -- e.g. SA001
    first_name      TEXT    NOT NULL,
    last_name       TEXT    NOT NULL,
    student_number  TEXT    NOT NULL UNIQUE,     -- e.g. 2021-12345
    department      TEXT    NOT NULL DEFAULT 'Procurement',
    duty_hours      INTEGER NOT NULL DEFAULT 5, -- target hours/week
    email           TEXT    NOT NULL,
    phone           TEXT    NOT NULL,
    status          TEXT    NOT NULL DEFAULT 'Active',  -- Active | Inactive
    notes           TEXT,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

-- --------------------------------------------------------
-- 2. SHIFT DEFINITIONS
--    Reference table that defines expected start/end times
--    and the label shown in the UI.
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS shifts (
    shift_key       TEXT    PRIMARY KEY,         -- First Shift | Second Shift | Third Shift | Whole Day
    label           TEXT    NOT NULL,            -- Morning Shift | Afternoon Shift | …
    expected_start  TEXT    NOT NULL,            -- HH:MM  (local)
    expected_end    TEXT    NOT NULL,            -- HH:MM  (local)
    duration_hours  REAL    NOT NULL,            -- expected net hours
    allows_custom   INTEGER NOT NULL DEFAULT 0   -- 1 if this shift allows custom times
);

-- --------------------------------------------------------
-- 3. DTR RECORDS
--    One row per check-in event.  time_out and
--    hours_worked stay NULL while the SA is on duty.
--    custom_start and custom_end are used for broken schedule
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS dtr_records (
    id              TEXT    PRIMARY KEY,         -- DTR<epoch-ms>
    sa_id           TEXT    NOT NULL REFERENCES student_assistants(id),
    department      TEXT    NOT NULL DEFAULT 'Procurement',
    shift_type      TEXT    NOT NULL REFERENCES shifts(shift_key),
    record_date     TEXT    NOT NULL,            -- YYYY-MM-DD
    time_in         TEXT    NOT NULL,            -- ISO-8601 local datetime
    time_out        TEXT,                        -- NULL while on duty
    status          TEXT    NOT NULL DEFAULT 'On Duty',   -- On Duty | Completed
    hours_worked    REAL,                        -- computed on checkout
    late_minutes    INTEGER DEFAULT 0,
    undertime_minutes INTEGER DEFAULT 0,
    custom_start    TEXT,                        -- HH:MM for custom broken schedule
    custom_end      TEXT,                        -- HH:MM for custom broken schedule
    created_at      TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

-- Speeds up "today's records" and "month's records" queries
CREATE INDEX IF NOT EXISTS idx_dtr_date
    ON dtr_records (record_date);

CREATE INDEX IF NOT EXISTS idx_dtr_sa_date
    ON dtr_records (sa_id, record_date);

CREATE INDEX IF NOT EXISTS idx_dtr_status
    ON dtr_records (status);

-- --------------------------------------------------------
-- 4. SEED DATA
-- --------------------------------------------------------

-- Shift definitions (Procurement standard schedule)
-- Updated times: Morning 7:00 AM - 12:00 NN, Afternoon 12:00 NN - 5:00 PM
INSERT OR IGNORE INTO shifts VALUES
    ('First Shift',  'Morning Shift (7:00 AM - 12:00 NN)',      '07:00', '12:00', 5.0, 0),
    ('Second Shift', 'Afternoon Shift (12:00 NN - 5:00 PM)',    '12:00', '17:00', 5.0, 0),
    ('Third Shift',  'Broken Schedule (Custom Time)',           '08:00', '17:00', 7.0, 1),
    ('Whole Day',    'Whole Day (7:00 AM - 5:00 PM)',           '07:00', '17:00', 9.0, 0);

-- Three sample Procurement SAs (mirrors original seed data)
INSERT OR IGNORE INTO student_assistants
    (id, first_name, last_name, student_number, department, duty_hours, email, phone, status)
VALUES
    ('SA001', 'Neil',       'Domingo',  '2021-12345', 'Procurement', 5, 'NeilDomingo@s.ubaguio.edu',   '+63 912 345 6789', 'Active'),
    ('SA002', 'Dane',       'Arciaga',  '2021-23456', 'Procurement', 4, 'dane.arciaga@s.ubaguio.edu',  '+63 912 456 7890', 'Active'),
    ('SA003', 'Mark Angelo','Garcia',   '2021-34567', 'Procurement', 6, 'mark.garcia@s.ubaguio.edu',   '+63 912 567 8901', 'Active');
