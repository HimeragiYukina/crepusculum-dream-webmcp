# OpenAI WebMCP Challenge — Change Record

This repository is a clean, rights-safe packaging of a personal website that existed before the OpenAI WebMCP Challenge. It does not claim the original site, world, or earliest tools as challenge-period work.

## Pre-challenge baseline

The latest original-site commit before the submission period is [`5acdbc7`](https://github.com/HimeragiYukina/HimeragiYukina.github.io/commit/5acdbc7), dated August 17, 2026. It already included:

- the explorable HD-2D home world and five content areas;
- global navigation, biography, and language WebMCP tools;
- Home tools for walking the traveler and inspecting its position; and
- Research tools for publication data and a BibTeX citation.

## Built during the challenge

Timestamped implementation evidence is the original repository's [`5acdbc7...5052cf2` comparison](https://github.com/HimeragiYukina/HimeragiYukina.github.io/compare/5acdbc7...5052cf2). Challenge-period work includes:

- page-aware registration and route-owned cancellation;
- page-specific versions of `get-page-overview` and `focus-page-section`;
- exclusive structured tools for Projects, Mods, Zine, and About;
- a Mods-only `goto_workshop_page` action;
- separate `get-citation` and `copy-citation` responsibilities with paste-ready BibTeX;
- `create-portfolio-tour`, which creates a visible goal-specific route shared by visitor and agent;
- visible, top-bar-aware centering and highlighting of selected sections;
- strict schemas, tool titles, cancellation signals, trust/read annotations, and character-budget checks;
- Chrome 149 build compatibility and an explicit standards-track `document.modelContext.registerTool` path;
- route-specific metadata, structured WebMCP documentation, and a repeatable six-route smoke test.

## Competition packaging — September 3, 2026

This repository was created during the submission period as a clean distribution of that documented implementation. Packaging changes do not add judging claims; they reduce third-party-rights ambiguity:

- replaced the top-bar avatar with an anonymous blue-and-white pixel identicon;
- omitted identity-specific game names and source artwork from the bundled playable mod presentation;
- replaced gallery and publication previews with nonrepresentational coarse mosaics;
- replaced card imagery with CSS mosaics and relic icons with four plain blocks;
- removed adapted third-party ASCII mascots from the Zine;
- omitted full-resolution photography sources while retaining only the optimized WebP files loaded by the site; and
- configured an independent GitHub Pages deployment and metadata surface.

See [PROVENANCE.md](PROVENANCE.md) for the relationship between the two repositories.

## Verification

```sh
npm install
npm run build
npm run test:webmcp
```

The smoke test checks expected tool totals (Home 7, Projects 8, Research 10, Mods 9, Zine 8, About 8), route cleanup, visible tour and section-focus effects, read-only biography behavior, complete BibTeX structure, and name/description/parameter/result budgets.

The interactive surface is tested in OpenAI Codex's WebMCP-capable in-app browser and Google Chrome 152 with WebMCP testing enabled.

## Official-rule check — September 3, 2026

The submission was reviewed against the [official rules](https://webmcp.devpost.com/rules) and the [challenge overview](https://webmcp.devpost.com/):

- the live project is public and requires no credentials;
- the production target is Chrome 149 or later and the same build is tested in the Codex in-app browser;
- the public repository contains the complete source, build instructions, assets required at runtime, a root MIT license, and an explicit `document.modelContext.registerTool` implementation;
- the original project is allowed as an existing project because the challenge-period WebMCP extensions are separated from the August 17 baseline by dated public commits;
- the submission story explains WebMCP fit, the human-agent experience, what both participants can do together, and the implementation;
- identity-specific and nonessential third-party visual source material and the coauthored paper PDF are excluded; permitted fonts and secondary profile-link marks are documented; and
- the remaining Devpost-only requirement is a public YouTube demonstration shorter than three minutes, with spoken audio and no unlicensed music or third-party media.

The rules page header lists the extended deadline as September 4, 2026 at 1:00 a.m. PDT. The body still shows the original September 3 submission-period time, so the visible challenge deadline and official organizer update are treated as controlling while retaining a margin for upload and final submission.

See [ASSET-AUDIT.md](ASSET-AUDIT.md), [LICENSE-CONTENT](LICENSE-CONTENT), and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for the copyright review.
