# Nōtis — Devpost Submission

---

## Inspiration

In India, over 60 million small businesses are registered under GST. Every one of them
receives notices — show cause notices, demand notices, ITC mismatch notices — and most
owners have no idea what to do. They either panic and pay a CA ₹5,000–₹10,000 to draft
a reply, or worse, they ignore the notice and face automatic penalties.

I built Nōtis because this problem is solvable. The law is public. The sections are known.
The circulars are published. What was missing was a system that could read a notice, search
the right legal sources in the right order, and produce a reply that a small business owner
could actually send — without needing to understand GST law at all.

---

## What It Does

Nōtis is an AI agent that:

- **Reads GST notices** — upload an image or PDF, it extracts the notice type, ARN number,
  demand amount, GSTIN, due date, sections cited, and the state the business is registered in
- **Searches real legal sources** — CGST Act 2017, Finance Act 2023 and 2026 amendments,
  CBIC circulars, and state SGST acts for Maharashtra, Karnataka, and Delhi
- **Drafts a ready-to-send response letter** — with proper legal citations, correct section
  references, and a list of documents to attach
- **Finds savings opportunities** — unclaimed ITC, penalty reductions, incorrect demand
  amounts, deadline extensions from circulars
- **Explains everything in plain language** — so the business owner understands what
  happened and what to do next

---

## How I Built It

**Agent**: Gemini 3.1 Pro via Google ADK (Agent Development Kit), with extended thinking
enabled so the agent reasons through the legal analysis before drafting a response.

**Legal knowledge base**: Indian GST law is a four-layer stack — base act, state acts,
Finance Act amendments, and CBIC circulars. A single Elasticsearch index would flatten this
hierarchy and lose it. Instead, I built **7 separate indices**, each scoped to one layer:

- `gst-cgst-2017` — base CGST Act, searched first on every query
- `gst-amendments-2023` / `gst-amendments-2026` — isolated so the agent can explicitly
  check whether a section changed and from what effective date
- `gst-sgst-mh` / `gst-sgst-ka` / `gst-sgst-dl` — state-specific, only searched when the
  GSTIN prefix matches that state (27 → Maharashtra, 29 → Karnataka, 07 → Delhi)
- `gst-circulars` — CBIC enforcement guidance, always searched last since circulars
  clarify and override, not define

All PDFs were parsed using a Gemini-powered pipeline that extracts sections with structured
metadata — section number, chapter, notice types, keywords, category — before indexing.
This means queries return the right section, not just the right paragraph.

**Search tools via MCP**: The Elasticsearch MCP server connects the agent to the legal
indices through four search tools — `search_cgst_act`, `search_amendments`,
`search_circulars`, and `search_sgst_act`. ADK's native MCP tool support handles routing
directly — no custom RAG pipeline required.

**Case management**: MongoDB stores every case with full conversation history, extracted
notice details, agent notes, and drafted responses.

**Backend**: Node.js + Express with Server-Sent Events for streaming the agent's thinking,
tool calls, and final response in real time. The ADK runner is invoked per request with
context — user ID, uploaded file, case ID — injected via a factory pattern so every
conversation is fully isolated.

**Frontend**: Next.js with a chat interface that renders the agent's reasoning steps, tool
calls with inputs and outputs, and the final response in structured markdown.

---

## Challenges

**GST law is a four-layer stack, and every layer matters.** A GST notice doesn't live in
one document — it sits at the intersection of four overlapping sources of law. The CGST Act
2017 is the base. State SGST acts add their own provisions — Maharashtra, Karnataka, and
Delhi each have rules that differ from central law. Finance Act amendments from 2023 and
2026 changed key sections of both. And CBIC circulars sit at the top, issuing enforcement
guidance that can override how a section is actually applied. Miss any one layer and the
answer is wrong. The agent had to be forced — via a strict research protocol in the system
prompt — to check all four in order before forming any response.

**PDF parsing for government documents.** Indian government GST PDFs are inconsistently
formatted across acts, amendments, and circulars — different section numbering schemes,
different heading structures, different PDF encodings. Getting clean structured text required
a Gemini-powered parsing pipeline that extracts sections with metadata — section number,
chapter, notice types, keywords, and category — before indexing into Elasticsearch.

**Accuracy over speed.** A wrong legal citation in a response letter could cost a business
real money. Every answer had to be grounded in retrieved documents, not model memory. The
mandatory research protocol and source citation in every response were designed specifically
to prevent hallucination on legal facts. The difference between Section 73 (no fraud, 10%
penalty) and Section 74 (fraud, 100% penalty) is not something the agent can get wrong.

**Streaming an agentic loop to the frontend.** ADK emits thinking events, tool call events,
tool response events, and final text events — all mixed in the same stream. Building the
SSE event filter to correctly separate and surface each type in real time, including
interactive clarification questions that pause the agent mid-stream, required real iteration.

---

## What I Learned

- ADK's native MCP tool support made connecting the agent to Elasticsearch straightforward —
  the agent calls search tools as natural function calls during reasoning, with no custom
  orchestration layer
- For legal AI, **prompt engineering matters as much as retrieval** — telling the agent
  exactly what to search, in what order, and how to cite sources is what separates a useful
  answer from a dangerous one
- The index design is the product — separating CGST, amendments, state acts, and circulars
  into distinct indices is what makes the agent's legal reasoning layered and correct, not
  just keyword-matched

---

## What's Next

- **GSTIN-based automatic context fetch** — query the GST portal directly to pull filing
  history (GSTR-1, GSTR-3B, GSTR-2A) and compare the demand against actual filed data
- **Pre-emptive return health check** — audit current returns before a notice arrives,
  catching ITC mismatches and GSTR-1/3B discrepancies before the department does
- **All 28 state SGST acts** — currently supporting Maharashtra, Karnataka, and Delhi;
  expanding to full national coverage
- **Vernacular language support** — explain notices and generate responses in Hindi and
  regional languages for small business owners who are not comfortable in English
- **Deadline tracking with reminders** — track open cases and send alerts before response
  deadlines to prevent automatic demand confirmation
- **GSTR return file analysis** — upload a return file directly and identify ITC mismatches,
  incorrect calculations, and filing errors before submission
