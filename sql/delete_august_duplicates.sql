-- DESTRUCTIVE: Deletes duplicate August sessions, keeping only:
--   • Aug 1 Workout A
--   • Aug 4 Workout B @ 2026-08-05 02:39:30+00 (10:39 PM local)
--
-- Run in Supabase SQL Editor. Review the SELECT first, then uncomment DELETE.

-- 1) Preview what will be deleted:
SELECT date, workout, exercise, weight, reps
FROM public.workouts
WHERE date >= '2026-08-01' AND date < '2026-09-01'
  AND NOT (
    -- Keep Aug 1 Workout A
    (date::date = '2026-08-01' AND workout = 'A')
    OR
    -- Keep Aug 4 Workout B @ 10:39 PM (the 02:39:30 UTC timestamp)
    (date = '2026-08-05 02:39:30.018+00' AND workout = 'B')
  )
ORDER BY date, exercise;

-- 2) Once confirmed, uncomment and run:
-- DELETE FROM public.workouts
-- WHERE date >= '2026-08-01' AND date < '2026-09-01'
--   AND NOT (
--     (date::date = '2026-08-01' AND workout = 'A')
--     OR
--     (date = '2026-08-05 02:39:30.018+00' AND workout = 'B')
--   );
