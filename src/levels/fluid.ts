/**
 * Projects — real-time GPU fluid simulation built during an internship at
 * Ubisoft Montreal, presented as an article with the captured test-scene
 * videos from src/assets/fluid-simulation.
 */
import { Router } from '../router';
import { makeArticleLevel } from './article';
import damUrl from '../assets/fluid-simulation/Breaking_Dam_10k.mp4';
import damObstacleUrl from '../assets/fluid-simulation/Breaking_Dam_with_Obstacle.mp4';
import waterfallUrl from '../assets/fluid-simulation/Waterfall.mp4';
import fountainUrl from '../assets/fluid-simulation/Fountain.mp4';
import planetUrl from '../assets/fluid-simulation/Liquid_Planet.mp4';
import gravityUrl from '../assets/fluid-simulation/Extreme_Gravity.mp4';

const SCENES = [
  { src: damUrl, title: 'Breaking Dam', desc: 'a 10k-particle column collapses and races across the tank' },
  { src: damObstacleUrl, title: 'Breaking Dam with Obstacle', desc: 'the collapsing column meets a barrier boundary' },
  { src: waterfallUrl, title: 'Waterfall', desc: 'an emitter pours from above while a sink drains the pool' },
  { src: fountainUrl, title: 'Fountain', desc: 'a jet fired upward falls back on itself in a steady plume' },
  { src: planetUrl, title: 'Liquid Planet', desc: 'gravity bends toward a user-defined point and the fluid finds an orbit' },
  { src: gravityUrl, title: 'Extreme Gravity', desc: 'the solver holds its footing under punishing forces' },
];

export function makeFluidLevel(router: Router) {
  return makeArticleLevel(router, 'projects', 'PROJECTS', (inner) => {
    inner.innerHTML = `
      <h1>Fluid Simulation</h1>
      <p class="abstract">
        During my internship at Ubisoft Montreal, I developed a real-time liquid simulator
        based on position-based fluids and implemented with GPU compute shaders.
      </p>
      <div class="rule"></div>

      <section>
        <h2>TEST SCENES</h2>
        <div class="video-grid">
          ${SCENES.map(
            (s) => `
          <figure class="video-card">
            <video src="${s.src}" autoplay muted loop playsinline preload="metadata"></video>
            <figcaption><b>${s.title}</b><span>${s.desc}</span><span class="credit">© Yunhao Luo · shared with Ubisoft's permission</span></figcaption>
          </figure>`,
          ).join('')}
        </div>
      </section>

      <section>
        <h2>SYSTEM CAPABILITIES</h2>
        <div class="cap-columns">
          <ul>
            <li><b>Core solver</b>
              <ul>
                <li>PBF simulation</li>
                <li>External forces</li>
                <li>Particle emitters / sinks</li>
                <li>Basic rendering</li>
              </ul>
            </li>
            <li><b>Performance</b>
              <ul>
                <li>Index bucket sorting for particles</li>
                <li>Efficient nearest-neighbor search</li>
                <li>PBF position correction</li>
              </ul>
            </li>
          </ul>
          <ul>
            <li><b>Advanced shading</b>
              <ul>
                <li>Refraction</li>
                <li>Reflection</li>
                <li>Thickness</li>
                <li>Absorption</li>
                <li>Splashes</li>
                <li>Surface smoothing</li>
              </ul>
            </li>
          </ul>
          <ul>
            <li><b>Boundaries</b>
              <ul>
                <li>Particle boundaries</li>
                <li>Barrier boundaries</li>
                <li>Viscosity</li>
                <li>Surface tension</li>
              </ul>
            </li>
            <li><b>Cross-platform</b>
              <ul>
                <li>Built with HLSL</li>
                <li>Runs on PCs and consoles</li>
              </ul>
            </li>
          </ul>
        </div>
      </section>

      <section>
        <h2>EXPERIMENT SETUP</h2>
        <ul>
          <li><b>GPU</b> — NVIDIA GeForce RTX 2070 SUPER</li>
          <li><b>Processor</b> — Intel Xeon W-2255 @ 3.70 GHz, 10 cores / 20 logical processors</li>
          <li><b>RAM</b> — 2 × 32 GB DDR4 RDIMM @ 2933 MHz</li>
        </ul>
      </section>

      <section>
        <h2>REFERENCES</h2>
        <ul>
          <li>Miles Macklin and Matthias Müller. 2013. <a href="https://doi.org/10.1145/2461912.2461984" target="_blank" rel="noopener">Position Based Fluids</a>. ACM Trans. Graph. 32, 4, Article 104.</li>
          <li><a href="https://developer.nvidia.com/gpugems/gpugems/part-vi-beyond-triangles/chapter-38-fast-fluid-dynamics-simulation-gpu" target="_blank" rel="noopener">GPU Gems — Fast Fluid Dynamics Simulation on the GPU</a></li>
          <li><a href="https://developer.nvidia.com/gpugems/gpugems3/part-v-physics-simulation/chapter-30-real-time-simulation-and-rendering-3d-fluids" target="_blank" rel="noopener">GPU Gems 3 — Real-Time Simulation and Rendering of 3D Fluids</a></li>
        </ul>
      </section>

    `;
  });
}
