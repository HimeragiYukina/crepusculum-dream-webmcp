import './style.css';
import { Router } from './router';
import { HomeLevel } from './levels/home';
import { makeFluidLevel } from './levels/fluid';
import { makePapersLevel } from './levels/papers';
import { makeModLevel } from './levels/mod';
import { makeAboutLevel } from './levels/about';
import { makeZineLevel } from './levels/zine';
import { initWebMCP } from './webmcp';
import { onLangChange, refreshChrome } from './i18n';
import { initMediaLoading } from './mediaLoading';

// Dev/demo affordance: ?mockmcp installs a recording model-context host so the
// WebMCP tools can be exercised from the console (window.__mcp).
if (new URLSearchParams(location.search).has('mockmcp') && !(document as any).modelContext) {
  const tools: any[] = [];
  const mock = {
    tools,
    registerTool(tool: any, options?: { signal?: AbortSignal }) {
      tools.push(tool);
      options?.signal?.addEventListener('abort', () => {
        const i = tools.indexOf(tool);
        if (i >= 0) tools.splice(i, 1);
      });
    },
    async call(name: string, params: any = {}) {
      const t = tools.find((q) => q.name === name);
      if (!t) throw new Error(`no such tool: ${name}`);
      return t.execute(params, { signal: new AbortController().signal });
    },
  };
  (document as any).modelContext = mock;
  (window as any).__mcp = mock;
}

const router = new Router();
const home = new HomeLevel(router);

initMediaLoading();

router.register(home);
router.register(makeFluidLevel(router));
router.register(makePapersLevel(router));
router.register(makeModLevel(router));
router.register(makeAboutLevel(router));
router.register(makeZineLevel(router));

initWebMCP(router, home);

// a language switch rewrites the currently-mounted UI chrome in place
onLangChange(() => refreshChrome());

void router.go(router.idFromHash(), false);
