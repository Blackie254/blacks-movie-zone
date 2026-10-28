---
name: Keith live-score reliability
description: A data-quality limitation observed in the Keith football live-score feed.
---

The `/livescore` feed can return matches from a previous date still marked as in progress, as well as implausibly large elapsed-minute values.

**Why:** blindly trusting those fields made completed fixtures appear live.

**How to apply:** Before displaying a match as live, verify its date against the current date in the target timezone and reject impossible elapsed times; exclude malformed records from current-score cards.
