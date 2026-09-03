/** Research — first-author publications, presented as an article. */
import { Router } from '../router';
import { makeArticleLevel } from './article';
import teaserCatchThrow from '../assets/research/catching-and-throwing/teaser-redacted.png';

export const BIBTEX = `@inproceedings{10.1145/3487983.3488300,
    author = {Luo, Yunhao and Xie, Kaixiang and Andrews, Sheldon and Kry, Paul},
    title = {Catching and Throwing Control of a Physically Simulated Hand},
    year = {2021},
    isbn = {9781450391313},
    publisher = {Association for Computing Machinery},
    address = {New York, NY, USA},
    url = {https://doi.org/10.1145/3487983.3488300},
    doi = {10.1145/3487983.3488300},
    booktitle = {Proceedings of the 14th ACM SIGGRAPH Conference on Motion, Interaction and Games},
    articleno = {15},
    numpages = {7},
    keywords = {throwing, physics-based animation, hand simulation, grasping, catching},
    location = {Virtual Event, Switzerland},
    series = {MIG '21}
}`;

export interface Publication {
  title: string;
  authors: string[];
  venue: string;
  year: number;
  doi: string;
  award?: string;
  awardUrl?: string;
  abstract: string;
  page?: string;
  teaser?: string;
}

export const PUBLICATIONS: Publication[] = [
  {
    title: 'Catching and Throwing Control of a Physically Simulated Hand',
    authors: ['Yunhao Luo', 'Kaixiang Xie', 'Sheldon Andrews', 'Paul G. Kry'],
    venue: 'Proceedings of the 14th ACM SIGGRAPH Conference on Motion, Interaction and Games',
    year: 2021,
    doi: '10.1145/3487983.3488300',
    award: "Best Presentation Award — MIG '21",
    awardUrl: 'https://mig2021.inria.fr/awards/',
    abstract:
      'This first-author work combines a finite-state nominal controller, proportional-derivative control, and inverse kinematics with reinforcement and imitation learning. The resulting policies improve robust physics-based catching and throwing across varied objects, targets, and motion goals.',
    page: 'https://profs.etsmtl.ca/sandrews/publication/catchthrow_mig2021/',
    teaser: teaserCatchThrow,
  },
];

export function makePapersLevel(router: Router) {
  return makeArticleLevel(router, 'research', 'RESEARCH', (inner) => {
    const p = PUBLICATIONS[0];
    inner.innerHTML = `
      <h1>Research</h1>
      <p class="abstract">Research on character animation — teaching simulated bodies to move with intent using high-level control policies assisted by reinforcement learning.</p>
      <div class="rule"></div>

      <div class="item-card">
        <div class="ic-title">${p.title}</div>
        <p><em>${p.authors.join(', ')}</em></p>
        <div class="ic-type">${p.venue}, ${p.year}</div>
        ${p.award ? (p.awardUrl
          ? `<a class="badge" href="${p.awardUrl}" target="_blank" rel="noopener">🏆 ${p.award}</a>`
          : `<span class="badge">🏆 ${p.award}</span>`) : ''}
        ${p.teaser ? `<figure class="ic-teaser-fig"><img class="ic-teaser" src="${p.teaser}" alt="Coarse mosaic replacing the original paper teaser" width="1250" height="247"><figcaption class="credit">Competition preview — the publication figure is intentionally redacted as a nonrepresentational mosaic.</figcaption></figure>` : ''}
        <p style="margin-top:10px; margin-bottom: 20px;">${p.abstract}</p>
        <div class="article-links">
          <a href="${p.page}" target="_blank" rel="noopener">AUTHOR PROJECT PAGE</a>
          <a href="https://doi.org/${p.doi}" target="_blank" rel="noopener">DOI ${
            // break hints after / and . so the pill wraps on narrow screens;
            // <wbr> adds no character, so the copied DOI stays intact
            p.doi.replace(/([/.])/g, '$1<wbr>')
          }</a>
        </div>
      </div>

      <section>
        <h2>CITE</h2>
        <div class="bibtex">
          <button class="bibtex-copy" type="button">Copy</button>
          <pre><code>${BIBTEX.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</code></pre>
        </div>
      </section>

      <section>
        <h2>COLLABORATION</h2>
        <ul>
          <li>This work was conducted with Kaixiang Xie, Sheldon Andrews (ÉTS Montréal), and Paul G. Kry (McGill University).</li>
        </ul>
      </section>
    `;

    // wire the BibTeX copy button
    const copyBtn = inner.querySelector<HTMLButtonElement>('.bibtex-copy');
    copyBtn?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(BIBTEX);
        copyBtn.textContent = 'Copied';
      } catch {
        copyBtn.textContent = 'Copy failed';
      }
      setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1600);
    });
  });
}
