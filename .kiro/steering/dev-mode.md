---
inclusion: manual
name: dev-mode
description: Development context mode. Invoke with #dev-mode for focused implementation.
---

# Dev Mode

When this mode is active, focus on shipping working, tested code.

## Rules

- Read relevant existing code before writing new code; match project style and libraries.
- Make the smallest change that fully solves the task.
- Prefer extending existing patterns over introducing new ones.
- After each change, build and run the relevant tests; fix failures before moving on.
- Use secure defaults: validate input, parameterize queries, handle errors.
- Keep functions small and early-return on error.
- No speculative features or abstractions beyond what the task needs.
