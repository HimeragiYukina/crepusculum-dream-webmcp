# Provenance and repository history

## Why this repository starts with a new history

The competition edition is a clean export rather than a fork. A fork would retain removed third-party source images in Git history even when they were absent from the current build. This repository therefore contains only the files required to build and test the rights-safe edition.

The clean history is not evidence that the whole project was created during the challenge. Dated development evidence remains public in the original repository.

## Source relationship

- Original live personal site: <https://himeragiyukina.github.io/>
- Original repository: <https://github.com/HimeragiYukina/HimeragiYukina.github.io>
- Last pre-challenge baseline: [`5acdbc7`](https://github.com/HimeragiYukina/HimeragiYukina.github.io/commit/5acdbc7), August 17, 2026
- Challenge-period implementation range: [`5acdbc7...5052cf2`](https://github.com/HimeragiYukina/HimeragiYukina.github.io/compare/5acdbc7...5052cf2)
- Competition repository: <https://github.com/HimeragiYukina/crepusculum-dream-webmcp>

Representative challenge-period commits include the page-aware registry, Chrome 149 hardening, visible portfolio tour, viewport-aware focus behavior, interface documentation, route metadata, and repeatable smoke tests. The comparison above is the authoritative complete record.

## Packaging boundary

Files were copied from original commit `5052cf2`, then transformed before the first competition-repository commit. Removed files and their history were never committed here. The retained application logic is functionally equivalent except for repository base paths, rights-safe copy, the new avatar, redacted previews, and CSS-generated case-study mosaics.

See [ASSET-AUDIT.md](ASSET-AUDIT.md) for the binary-asset boundary and reproducible checks.
