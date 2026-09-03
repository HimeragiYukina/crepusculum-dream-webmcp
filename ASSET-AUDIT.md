# Competition asset audit

Audit date: September 3, 2026

This clean repository was assembled specifically to keep the challenge submission independent of identity-specific third-party artwork retained by the original personal-site repository.

## Excluded material

The repository and its new Git history exclude:

- the prior character avatar and favicon;
- all source card, relic, gallery, and screenshot artwork from the upstream fan-mod presentation;
- the original publication teaser and coauthored paper PDF;
- the third-party Turnstile language icon;
- adapted third-party ASCII mascots from the Zine; and
- full-resolution source photographs that are unnecessary at runtime.

The Mods page keeps ordinary external links to the separately maintained Workshop listing and source repository. Their target content is not bundled, proxied, or reproduced by this project.

## Retained material

- Yunhao Luo's photography and poetry;
- procedural canvas environment, effects, and gameplay-scale traveler;
- fluid-simulation recordings produced by Yunhao Luo and shared with Ubisoft's permission, containing no internal Ubisoft assets;
- factual research metadata, an original publication summary, DOI and author-project links, and paste-ready BibTeX;
- SIL Open Font License fonts documented in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md); and
- standard GitHub and LinkedIn profile-link marks used only as permitted secondary social buttons and excluded from the project license grants;
- new competition-edition identicon and nonrepresentational mosaics, plus CSS-only card and relic color grids.

## Verification result

A final SHA-256 comparison covered 27 restricted originals from the baseline repository: all prior Mods source images, both prior avatar files, both original research teaser files, and the prior public favicon and Open Graph image. It compared them against all 31 image, vector, and video files in the clean tree after the social and Devpost media were generated. Exact matches: **0**.

A filename, source-reference, and sensitive-term scan found no bundled path or import referring to those files. The sole retained identity-specific string is inside the user-requested external source-repository URL; it is not visible page copy or a bundled asset.

Because this repository begins with the sanitized tree rather than a fork, the excluded originals are absent from Git history as well as the current checkout.
