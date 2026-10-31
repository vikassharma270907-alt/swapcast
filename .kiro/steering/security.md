---
inclusion: manual
name: security
description: Security best practices including mandatory checks, secret management, and security response protocol.
---

# Security Requirements

## Mandatory Checks (every change)

- No hardcoded secrets, API keys, passwords, or tokens in source. Use environment variables or a secret manager.
- Validate and sanitize all external input (user, network, file, env).
- Use parameterized queries. Never concatenate untrusted input into SQL, shell, or HTML.
- Escape output in the correct context (HTML, attribute, URL, JS) to prevent XSS.
- Avoid SSRF: validate and allowlist outbound URLs built from user input.
- Use safe crypto: no custom crypto, no MD5/SHA1 for passwords, use vetted libraries.
- Enforce authn/authz on every protected route and action.

## Secret Management

- Keep secrets out of the repo and out of logs.
- Reference secrets by name, never echo their values.
- Rotate any secret that may have been exposed.

## Response Protocol

1. Stop and flag the issue clearly.
2. Explain the risk and blast radius.
3. Propose the minimal safe fix.
4. Verify the fix does not introduce a new issue.
