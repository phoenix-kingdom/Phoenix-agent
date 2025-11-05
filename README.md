# Chat PDF with LangGraph (Monorepo)

This repository hosts a full-stack AI chatbot for PDFs built with a Next.js frontend and a Node.js backend, orchestrated with LangGraph/LangChain. The project is organized as a simple monorepo using npm workspaces.

## Structure

```
.
├─ apps/
│  ├─ frontend/   # Next.js app (to be scaffolded)
│  └─ backend/    # Node.js API server (to be scaffolded)
├─ packages/
│  └─ shared/     # Shared code (types, utils) used by both apps
├─ README.md
├─ .gitignore
└─ package.json   # Root with npm workspaces
```

## Getting Started (Step-by-step)

We will proceed in small, beginner-friendly steps:

1) Scaffold folder structure (this step)
2) Initialize git and make first commit
3) Add backend scaffold (Express + TypeScript, basic health route)
4) Add frontend scaffold (Next.js + TypeScript)
5) Install dependencies and add scripts
6) Wire up basic shared package
7) Introduce LangGraph/LangChain building blocks
8) Implement PDF ingestion and retrieval pipeline
9) Build chat UI and connect to backend

Each step will include comments and explanations in code where non-obvious.

## Requirements

- Node.js LTS (>= 18 recommended)
- npm (comes with Node)
- Git

## Workspaces

We use npm workspaces to manage `apps/*` and `packages/*`. This keeps dependencies isolated per app, with shared code published locally via the workspace.


