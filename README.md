# Table Tennis Scorekeeper

A mobile-first web app for tracking table tennis singles and doubles games.

## Features

- Separate setup page for selecting singles/doubles, entering player names, and inputting the target score.
- Choose who starts from the scoring page so repeated games can reuse the same players without editing setup.
- Tap the side that scored to increment.
- Long-press a side to continuously decrement/correct until released.
- Singles and doubles modes.
- Configurable first server and first receiver for legal doubles service rotation.
- Automatic service switch prompts: every 2 points before deuce, every point from deuce onward.
- Doubles service order follows ITTF Law 2.13.5: at each service change, the previous receiver becomes server and the previous server's partner receives.
- Win-by-two game ending at the chosen target score, 11 by default.

## Development

```bash
npm install
npm run dev
npm run build
```
