# DPPN Review — Pending queue (resume tracker)

**Status (2026-06-30, later pass): queue EMPTY again.** A re-scan found a/ draft/needs_check grew
800 → 980 (≈180 new entries translated ~07:46–07:49 today, span `anomasatta` → `aputtaka`). ALL 180
have now been reviewed and logged across six `## Batch:` sections in `review-log.md`
(Anomasatta→Anujjā 30; Anukampakasutta→Anūpama Thera 32; Anupanāhīsutta→Anusāsikajātaka 22;
Anusayā Sutta→Apalokinasutta 31; Āpaṇa→Appakāvagga 40; Appamādasutta 01→Aputtaka 25). The whole
letter `a/` is now reviewed through `aputtaka`.

**One needs_check remains: `a/anuruddha-02.md`** (a Codex-trial entry, already logged). Its `[CHECK]`
note flags that the English source itself reads "finding Ānanda still *asekha* … until he became an
*Arahant*" — an apparent contradiction in Malalasekera's printed text (likely a typo for *sekha*). The
VI translation faithfully preserves the source; resolving the flag needs a human check against a print
edition, so it is intentionally left as needs_check. Do NOT silently flip it to draft.

Other letters (b–y) still have no new drafts beyond the already-reviewed Sonnet/Codex trials
(j/jetavana, k/kosala, m/magadha, s/savatthi, u/upali*, v/veluvana).

**Before the next review session:** RE-SCAN the draft count — Codex/Antigravity keep translating, so
new `a/` (and eventually `b/`+) drafts will appear. Binary-safe scan:
`grep -ral 'status: "\(draft\|needs_check\)"' <letter>/` (bash listing/counts only; use host Read/Edit
for entry BODIES — the mount truncates/corrupts them and serves a stale review-log.md).

To find the new pending set: list all draft/needs_check entries, subtract everything already in
`review-log.md`.

## Known residual (tiny, for the build/fix pass)

- `a/annata-kondanna-thera-anna-kondanna-thera.md`: one term-span still reads `Therágāthā` (should be
  `Theragāthā`). The Edit old_string wouldn't match (encoding); fix during build.

## Progress (2026-06-30 session)

- `ananda-02` → `anomarama-02`: **240 entries reviewed**, 21 low-risk fixes, 0 needs_check.
  Logged across multiple `## Batch:` sections in review-log.md.
- `anomasatta` → `aputtaka` (later fallback pass): **180 new entries reviewed**, 23 low-risk fixes,
  0 new needs_check (anuruddha-02 pre-existing). Letter `a/` fully caught up.
