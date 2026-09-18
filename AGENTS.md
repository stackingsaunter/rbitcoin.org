# Agent notes (rbitcoin.org)

## What this is

Static marketing site for **rbitcoin**. Document root is `public/`. Clone-and-serve; **no build** required for deploy.

## Plain technical language

Write like Brandon Black’s Bitcoin Magazine technical pieces and recent X: an observation or question first, then the mechanism. Short sentences mixed with longer ones. Third person on the site. Honest 0.x. Concrete, not cute.

- **OK:** precise domain terms, honest 0.x status, approximate metrics labeled as such
- **Not OK:** inventing benchmarks, burying milestone script-skip, unmarked sincere “production ready” claims, slogans, mill metaphors, stacked marketing noun phrases
- **Mainnet:** consensus is independent of bitcoin core’s engine. Prose should note growing functional, fuzz, and spec coverage as reason to expect a match; ironic **Production Ready™** on chips/footer is fine. Suggest — do not instruct — that operators may want another node in view for wallets until satisfied. Signet/regtest remain the lab before you trust a wallet. Do not lead with “reckless” or “prefer signet.”

Do **not** inject moralizing, political framing, or hype.

## What rbitcoin is (marketing facts)

Use this for site copy accuracy. Do **not** hardcode a canonical “why it exists” narrative here — that lives on About (`#why`) and is actively edited.

- **bitcoin full node** (full archival; Linux-first)
- **Compact archive**, **no UTXO set** — custom on-disk store, not bitcoin core-style chainstate + blk files
- **Structural transaction index** — written during IBD; sync requires it (do not describe as optional txindex)
- **Rust-native consensus:** rust-bitcoin types; libsecp256k1 for ECDSA/Schnorr; no `libbitcoinconsensus`
- **Custom indexing** matched to bitcoin query patterns — operator-facing only; no store internals (fuse8, `create_fk`, mmap/L0, denserel, allocate-then-publish) on rbitcoin.org
- In-process **Electrum** (including silent payment tweaks) and optional **Esplora**; optional **bitcoin core-class JSON-RPC subset**
- **About `#why`:** third person; motivation and history live on the site — do not invent or hardcode a canonical “why” in this file

## Facts and claims

- Product numbers and CLI examples must track the **node** repo README / OPERATOR (`github.com/reardencode/rbitcoin` / workspace `rearden-bitcoin`). Label ballpark figures as approximate. Coverage % on Home / Security / About is filled in the client from the node `badges` branch (last green `master` coverage job) — do not hardcode a snapshot. HTML fallbacks may show the last known badge so no-JS still has a number.
- Name the current published tag on **install/download** (and the home version chip). The site fills the **highest GitHub Release semver** (non-draft, non-prerelease, `vMAJOR.MINOR.PATCH`) in the client from the Releases API — do not hardcode a patch, and do not list older tags. Everywhere else prefer “rbitcoin” / **0.x**, not a patch. GitHub Release: Linux musl (operator binary), Windows CRT-static, Darwin aarch64 (ad-hoc signed, not notarized). **Nix** (`nix build .#rbitcoin-musl`) is the **reproducible** Linux path. Linux first; Darwin/Windows are snapshots (no IoRing on Windows; Darwin needs `xattr -d com.apple.quarantine` if Gatekeeper kills it).
- Do not invent “faster than bitcoin core” or storage SLAs. Published GiB / IBD hours are **one measured mainnet store / laptop IBD**, labeled as such — not a warranty. The tip moves. Default milestone vs **`--milestone 0`** does **not** change IBD wall-clock much on rbitcoin; still state that the default skips historical scripts.
- Full archival only — no pruning. Linux-first. **Full Electrum wallet serving** (including **silent payment tweaks** and Frigate scan-key subscribe) and optional Esplora are wallet-client backends, not a block explorer product. Electrum **1.6** package broadcast is in.
- Do **not** name `--sh-index` or `--sp-tweaks` on Home / Architecture / About. Talk about the capability. Get started copy-paste may include `--sh-index` because Electrum/Esplora refuse to start without it. Point operators to OPERATOR.md for the rest of the CLI. Flags are kebab-only (`--signet-challenge`, not `--signetchallenge`).
- **Reproducible builds:** pinned Nix flake + `Cargo.lock` produce **byte-identical** static musl `rbitcoin-node` / `rbitcoin-cli` for a given revision. That is the Linux verification path, not the only way to get a binary. The flake also exports a NixOS `services.rbitcoin` module.
- **Storage (0.7, one measured mainnet store):** about **720 GiB** fully indexed; about **226 GiB** stays **hot** even with full indexes. Building the scripthash index needs about **150 GiB extra** on the hot volume until pack finishes (not in the settled 720 GiB). Still plan a **1 TB-class** disk. **`--datadir-cold`** puts rarely-read `inwit` on a second volume.
- **IBD:** laptop-class IBD in **under 9 hours** — one measured run, not a warranty. Default mainnet `--milestone 840000` still skips historical script/sig checks; `--milestone 0` checks them. That choice barely moves wall-clock.
- **Schema 24** is current. Occupied **0.6.x** (schema 20) stores **refuse** — wipe the datadir and redo IBD. Empty indexes may rewrite `meta`.
- Consensus stack: **rust-bitcoin** + **libsecp256k1**. No `libbitcoinconsensus`.
- **JSON-RPC** is an optional bitcoin core-class **subset** (`--rpc-listen` TCP Bearer `{datadir}/rpc.token`, or `--rpc` unix socket). No cookie, no `--rpcuser`. Includes a **block template selector** (`getblocktemplate` / `getmininginfo`) — not a stratum/pool stack, no wallet. No coins-database UTXO scan.
- **Tests (operator-facing):** production LCOV **≥92%** PR gate (was 90% on 0.6). **66** unmodified bitcoin core v31.1 functional scripts hit production (labeled runner prints 72 with transport twins). Hornet rules + continuous differential fuzz remain.
- Packed **mempool persist** (restart does not rewrite the whole mempool body) is operator-facing; do not put store internals on the site.
- Marketing pages stay **operator-facing**. Do not put store internals on rbitcoin.org; those belong in the node repo.
- First-class CTAs: **Get started** and **Donate**. Keep Donate in the header and on the home/get-started bands.

## Contact (fixed)

| Purpose | Channel |
|---------|---------|
| General | freedom@reardencode.com |
| X | https://x.com/reardencode |
| Security | security@reardencode.com |
| Source | https://github.com/reardencode/rbitcoin |

Do not invent Discord/Telegram or other socials.

## Deploy invariant

`public/` must remain servable as committed. Do not introduce a required build, Node runtime on the server, or server-side templates.

## Site structure

Duplicate shared chrome (header/footer) across pages carefully. When changing nav/footer, update **every** page under `public/`.

Internal `href`/`src` must be **relative** (and name `index.html` for pages) so the tree works from `file://` and from a non-root URL. Do not use site-root paths like `/architecture/`. Canonical and Open Graph URLs stay `https://rbitcoin.org/...`.

## Commits

Small, logical commits with complete-sentence messages. This tree is public.
