/**
 * The Zine — "experimental Poetry", a web recreation of the zine I made for
 * my modern poetry class. The scanned Hagiwara Kyōjirō poem from the print
 * zine is cited rather than reproduced.
 */
import { Router } from '../router';
import { makeArticleLevel } from './article';

// "Stars" — the space between the asterisks IS the poem
const STARS_BOX = String.raw`*    *    *    *    *    *    *    *    *    *    *    *    *
*                                                           *
*                                                           *
*                                                           *
*                                                           *
*    some space created for you to imagine the actual       *
*    distance                                               *
*                                                           *
*                                                           *
*                                                           *
*                                                           *
*                                                           *
*                                                           *
*    *    *    *    *    *    *    *    *    *    *    *    *`;

// "Behavior Tree During the COVID-19 Pandemic" — the tree, re-typeset for the web
const BEHAVIOR_TREE = String.raw`(?)
 ├─ (→) ─ Is sleepy? ────────► Go to bed.
 │
 ├─ (→) ─ Is hungry? ────────► (~?) ─┬─ Order food for delivery.
 │                                   ├─ Cook instant noodles.
 │                                   └─ Cook some real food.
 │
 ├─ (→) ─ Have any assignments? ─► (~?) ─┬─ (→) ─┬─ Pick an assignment to finish.
 │                                     │       └─ Finish the picked assignment.
 │                                     └─ Play some games while being guilty
 │                                        of not doing the assignments.
 │
 └─ Philosophical meditation and chores.`;

export function makeZineLevel(router: Router) {
  return makeArticleLevel(router, 'zine', 'THE ZINE', (inner) => {
    inner.innerHTML = `
      <h1>experimental Poetry</h1>
      <p class="abstract">A zine for my modern poetry class — structural beauty, scientific diagrams,
        and typographic experiments recreated for the web.</p>
      <div class="rule"></div>

      <div class="zine-paper">
        <div class="zine-cover-title">experimental<br>Poetry</div>
        <div class="zine-byline">by Yunhao Luo</div>
        <div class="zine-credit">© 2026 Yunhao Luo · text &amp; layout licensed
          <a href="https://creativecommons.org/licenses/by-nc-nd/4.0/" target="_blank" rel="noopener">CC BY-NC-ND 4.0</a>.</div>
      </div>

      <div class="zine-paper">
        <h2>Intro</h2>
        <p>Welcome to my world of <b>Experimental Poetry</b>.</p>
        <p>
          Let’s explore the boundaries of modern poetry in this bizarre world of structural beauty,
          scientific diagrams, and typography shaped by computer programs!
        </p>
      </div>

      <div class="zine-paper">
        <div class="zine-part">RANDOM POEMS</div>

        <h2>Sweet Dreamer</h2>
        <p>
          I would bring stars into your dream<br>
          and pray that you can survive the Ultimate Meteor Shower!
        </p>
        <p>
          It’s a joke.<br>
          I would rather sit alongside you.<br>
          We would watch the showering stars together, overnight.<br>
          It shall be a sweet dream.
        </p>
      </div>

      <div class="zine-paper">
        <h2>Compress the World!</h2>
        <p>
          Once a world was blessed<br>
          by the fire of unrest,<br>
          and then it was compressed<br>
          by a CPU thread!
        </p>
        <p>
          The demon from a higher dimension<br>
          played this poor world for his satisfaction.<br>
          He smashed everything into pieces.
        </p>
        <p class="zine-indent1">He mapped the pieces into random symbols.</p>
        <p class="zine-indent2">He dyed the symbols with pale pigments.</p>
        <p>
          And he glued them together,<br>
          pretending that everything is untouched.<br>
          “Isn’t it beautiful?” he asked.<br>
          Yet no reply came as time passed.<br>
          Because those pitiful creatures
        </p>
        <p class="zine-indent1">in the once kindled world</p>
        <p>had become</p>
        <div class="zine-broken">BROKEN</div>
        <p class="zine-indent2">pieces</p>
        <p class="zine-indent1">of</p>
        <p class="zine-indent2">symbols</p>
        <p class="zine-indent1">that will never echo a word.</p>
      </div>

      <div class="zine-paper">
        <h2>Stars</h2>
        <p>
          Gazing into deep space filled with shining stars,<br>
          we realized that those distant celestial bodies<br>
          are probably
        </p>
        <pre class="zine-mono">${STARS_BOX}</pre>
        <p>millions of light years away.</p>
        <p>
          The immense universe belittles our pitiful civilization<br>
          which is now troubled by some tiny viruses<br>
          on the scale of nanometers.
        </p>
        <p>
          But it’s hard to create a space for you to imagine something small.<br>
          Therefore, I leave no space here till the very end of this page:
        </p>
        <div class="zine-void" role="img" aria-label="a page of solid black — no space at all"></div>
      </div>

      <div class="zine-paper">
        <h2>Behavior Tree During the COVID-19 Pandemic</h2>
        <p>Let’s play a game:</p>
        <ol class="zine-rules">
          <li>A circle is a “node.” Arrows linking nodes represent the relationship between nodes.
              An arrow points from a “parent node” to a “child node.”</li>
          <li>“?” means “try all child nodes; return true once a child has returned true, or return
              false if all child nodes have returned false.”</li>
          <li>“→” means “try all child nodes; return false once a child has returned false, or return
              true if all child nodes have returned true.”</li>
          <li>A question returns true or false based on your answer to it. An action always returns true.</li>
          <li>~ means try child nodes in random order; otherwise child nodes are tried from left to right
              in order. The return rule is specified by “?” or “→” in the node.</li>
        </ol>
        <p>Start from the “?” at the top of this “tree” and follow the rules above to figure out my
           daily life in this pandemic.</p>
        <pre class="zine-mono">${BEHAVIOR_TREE}</pre>
      </div>

      <div class="zine-paper">
        <div class="zine-part">POETRY COMMENTS</div>
        <p class="zine-note">
          The print zine reproduces Hagiwara Kyōjirō’s “Untitled” (1920s) here — a typeset whirl of
          arrows, bars and scattered stanzas, from William O. Gardner’s <em>Advertising Tower</em>
          (see Works Cited). The commentary below responds to it.
        </p>
        <p>
          This poem is very visually striking. It reminds me of the game books I read when I was a
          little child. In the game books, you choose an action and follow its arrow to get to the next
          scene. It was fun spending the whole afternoon playing with them.
        </p>
        <p>
          Aside from the general impression, the content is so uncanny that I can barely tell what is
          going on. Nevertheless, there are consecutive actions accompanied by intimate depictions of
          thought. It feels like an action film with a voice-over commenting on the protagonists’
          thoughts. The three stanzas are also likely told from different protagonists’ points of view.
        </p>
        <p>
          More interestingly, my friend thinks the protagonists are cars, and the poem depicts a car
          accident with explosions and flames. Now I cannot shake this vivid impression. What do
          you think about this?
        </p>
        <p>
          Undoubtedly, Hagiwara Kyōjirō was a huge fan of Dadaism. He also shared his friend Hagiwara
          Sakutarō’s taste for surrealism. Moreover, his clever use of typesetting techniques turned his
          poems into abstract Dadaist paintings. It is hard to imagine that his poems date from the
          1920s; they look like modern creations generated by computer programs. Considering that the
          Turing machine, one of the foundations of modern computing, was introduced in 1936, Kyōjirō
          was far ahead of his time!
        </p>
      </div>

      <div class="zine-paper">
        <h2>Postscript</h2>
        <p>
          Creating poems with special structures, tree diagrams, and typographic layouts for this zine
          has eaten away a huge chunk of my time. But it was so enjoyable that I even forgot to sleep.
          I consider these visual structures the rhymes of my poetry as well!
        </p>
        <p>
          I’m not content with this short zine, and I should and will write more. This course has been
          interesting and has encouraged me to explore the world of modern poetry. Thank you!
        </p>
      </div>

      <div class="zine-paper">
        <h2>Works Cited</h2>
        <p class="zine-cite">Hagiwara, Kyōjirō. “Untitled.” <em>Advertising Tower: Japanese Modernism and
          Modernity in the 1920s</em>, by William O. Gardner, Harvard Univ. Press, 2006, p. 247.</p>
      </div>
    `;
  });
}
