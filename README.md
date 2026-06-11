EcoSphere — Personal Carbon Coaching (HacktoSkill prompt-wars)

Overview

EcoSphere is a client-side web application that helps individuals estimate, track, and reduce their carbon footprint through simple actions and deterministic, explainable recommendations. It emphasizes transparency: deterministic emission factors, a clear Carbon Health Score, and traceable assumptions.

Key Features

- Deterministic Carbon Calculator: transport, home energy, diet, and shopping categories using simple emission factors.
- Explainable Carbon Health Score: 0-100 score based on total emissions with a short caveats string that documents assumptions.
- Context-Aware Coach: deterministic rules choose personalized recommendations (no external AI) with estimated annual savings and "apply" actions that convert tips into habits or pledges.
- Persistence & History: assessments are saved to localStorage. The app renders an assessment history chart and recent snapshots.
- Interactive Visuals: emissions doughnut chart and a virtual forest canvas that grows as you offset/simulate actions.
- Gamification: XP, leveling, badges, habits, and pledges to encourage sustained behavior.
- Accessibility & UX: keyboard-focusable controls, readable contrast, and simple UI components.

Files

- index.html — Main UI
- styles.css — Styling (dark glassmorphism theme)
- app.js — Application logic (calculator, coach, history, canvas)
- README.md — This file

How to run

Option 1 — Open directly
- Open `index.html` in your browser. Some browsers restrict local file access for canvas or module features; if things look wrong, use the simple server option below.

Option 2 — Local static server (recommended)

```bash
# Python 3 (from the project folder)
python -m http.server 8000
# Then open http://localhost:8000 in your browser
```
Run tests (optional)

This project includes a lightweight unit test for the core calculations using Vitest. To run tests locally you need Node.js installed.

```bash
npm install
npm test
```

How this solves the challenge

- Understand: Users answer a 4-step wizard that captures their transport, energy, diet, and shopping behaviors. The app shows a clear breakdown and the dominant emission source.
- Track: Each calculation is saved in a local history with a chart to show trends.
- Reduce: The coach provides simple, prioritized, deterministic actions with estimated savings. Actions can be applied immediately (as habits or pledges) to update the user's profile and simulated savings.
- Explain: The Carbon Health Score maps emissions into an easy 0–100 scale and each assessment stores caveats documenting the assumptions.

Next steps (optional)

- Add optional Firebase persistence and authentication for cross-device sync.
- Expand emission factor catalog and make it versioned.
- Add unit tests and CI linting.

If you'd like, I can:
- Integrate Firebase sign-in and persistence.
- Add export/import for user data (implemented: Export JSON/CSV and Print report buttons in the UI).
- Polish the coach rules and add more fine-grained savings estimates.

Recent updates:
- Added Export JSON/CSV and Print Report from the Assessment History card.
- Added printable summary report and improved ARIA attributes for better accessibility.

Enjoy — tell me which enhancements you'd like next.