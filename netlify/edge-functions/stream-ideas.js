/* ============================================================
   stream-ideas.js — Netlify Edge Function (streaming version)

   Same job as generate-ideas.js, but streams Claude's response
   to the browser chunk-by-chunk instead of waiting for the whole
   response. This bypasses the 26-second function timeout.

   Edge functions use Deno's web-standard APIs — Request/Response,
   ReadableStream, fetch — rather than Node's older patterns.
   ============================================================ */

import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.30.0';
import Parser from 'https://esm.sh/rss-parser@3.13.0';

// ---------- Sources (duplicated here because edge functions can't
// import from netlify/functions directly — they're separate runtimes).
// In a more mature build, we'd extract these to a shared module.
const SOURCES = [
  { category: 'Nationals', name: 'BBC News',        url: 'https://feeds.bbci.co.uk/news/rss.xml' },
  { category: 'Nationals', name: 'The Guardian',    url: 'https://www.theguardian.com/uk/rss' },
  { category: 'Nationals', name: 'Sky News',        url: 'https://feeds.skynews.com/feeds/rss/home.xml' },
  { category: 'Nationals', name: 'The Independent', url: 'https://www.independent.co.uk/news/uk/rss' },
  { category: 'Nationals', name: 'Financial Times', url: 'https://www.ft.com/rss/home/uk' },
  { category: 'Tabloids',  name: 'Daily Mail',    url: 'https://www.dailymail.co.uk/articles.rss' },
  { category: 'Tabloids',  name: 'Daily Mirror',  url: 'https://www.mirror.co.uk/news/?service=rss' },
  { category: 'Tabloids',  name: 'The Sun',       url: 'https://www.thesun.co.uk/feed/' },
  { category: 'Tabloids',  name: 'Daily Express', url: 'https://www.express.co.uk/posts/rss/1/uk' },
  { category: 'Tabloids',  name: 'Metro',         url: 'https://metro.co.uk/feed/' },
  { category: 'Tabloids',  name: 'Daily Star',    url: 'https://www.dailystar.co.uk/news/?service=rss' },
  { category: 'Specialist',name: 'BBC Health',       url: 'https://feeds.bbci.co.uk/news/health/rss.xml' },
  { category: 'Specialist',name: 'BBC Business',     url: 'https://feeds.bbci.co.uk/news/business/rss.xml' },
  { category: 'Specialist',name: 'Guardian Society', url: 'https://www.theguardian.com/society/rss' },
  { category: 'Specialist',name: 'Guardian Travel',  url: 'https://www.theguardian.com/uk/travel/rss' },
  { category: 'Regional',  name: 'Manchester Evening News', url: 'https://www.manchestereveningnews.co.uk/?service=rss' },
  { category: 'Regional',  name: 'Birmingham Live',         url: 'https://www.birminghammail.co.uk/?service=rss' },
  { category: 'Regional',  name: 'Liverpool Echo',          url: 'https://www.liverpoolecho.co.uk/?service=rss' },
  { category: 'Regional',  name: 'Yorkshire Post',          url: 'https://www.yorkshirepost.co.uk/rss' },
  { category: 'Regional',  name: 'Wales Online',            url: 'https://www.walesonline.co.uk/?service=rss' },
  { category: 'Regional',  name: 'Edinburgh News',          url: 'https://www.edinburghnews.scotsman.com/rss' },
  { category: 'Culture & Opinion', name: 'Guardian Opinion',     url: 'https://www.theguardian.com/uk/commentisfree/rss' },
  { category: 'Culture & Opinion', name: 'Guardian Long Reads',  url: 'https://www.theguardian.com/news/series/the-long-read/rss' },
  { category: 'Culture & Opinion', name: 'Guardian Culture',     url: 'https://www.theguardian.com/uk/culture/rss' },
  { category: 'Culture & Opinion', name: 'Guardian Lifestyle',   url: 'https://www.theguardian.com/uk/lifeandstyle/rss' },
  { category: 'Culture & Opinion', name: 'FT Weekend',           url: 'https://www.ft.com/life-arts?format=rss' },
  { category: 'Culture & Opinion', name: 'Dazed',                url: 'https://www.dazeddigital.com/rss' },
  { category: 'Culture & Opinion', name: 'Stylist',              url: 'https://www.stylist.co.uk/feed' },
  { category: 'Culture & Opinion', name: 'Refinery29 UK',        url: 'https://www.refinery29.com/en-gb/rss.xml' },
  { category: 'Substack', name: 'The Honest Broker (Ted Gioia)', url: 'https://www.honest-broker.com/feed' },
  { category: 'Substack', name: 'After Babel (Jonathan Haidt)',  url: 'https://www.afterbabel.com/feed' },
  { category: 'Substack', name: 'Culture Study (Anne Helen Petersen)', url: 'https://annehelen.substack.com/feed' },
  { category: 'Substack', name: 'The Browser',                   url: 'https://thebrowser.com/feed/' },
  { category: 'Substack', name: 'Embedded (Kate Lindsay)',       url: 'https://embedded.substack.com/feed' },
  { category: 'Grassroots Culture', name: 'Garbage Day (global internet culture)', url: 'https://www.garbageday.email/feed' },
  { category: 'Grassroots Culture', name: 'The Face (UK youth & style)', url: 'https://theface.com/feed' },
  { category: 'Grassroots Culture', name: 'Huck (UK independent culture)', url: 'https://www.huckmag.com/feed' },
  { category: 'Grassroots Culture', name: 'It\'s Nice That (UK creative culture)', url: 'https://www.itsnicethat.com/feed' },
  { category: 'Grassroots Culture', name: 'shado (UK identity & culture)', url: 'https://shado-mag.com/feed/' },
  { category: 'Grassroots Culture', name: 'The Fence (UK satire & commentary)', url: 'https://thefence.online/feed/' },
];

const MAX_TODAY = 60;
const MAX_WEEK = 40;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * ONE_DAY_MS;
const JUNK_PATTERNS = [
  /\(aff\)/i, /^advertisement:/i, /^promoted:/i, /^sponsored:/i,
  /\bdeal of the day\b/i, /\bamazon prime day\b/i, /\bblack friday\b/i,
  /\b\d+% off\b/i, /\bfalls below £/i, /\bcatching attention\b/i,
  /\b(aff\.|affiliate)\b/i
];

const parser = new Parser({
  timeout: 12000,
  headers: {
    'User-Agent': 'IdeaJacker/1.0 (UK PR ideation tool; contact: hello@example.com)',
    'Accept': 'application/rss+xml, application/xml, text/xml, */*'
  }
});

// ---------- News fetching (same logic as the regular function) ----------

async function fetchOne(source) {
  try {
    const feed = await parser.parseURL(source.url);
    const items = (feed.items || []).slice(0, 25);
    return items.map(item => ({
      source: source.name,
      category: source.category,
      title: (item.title || '').trim(),
      link: item.link || '',
      date: item.isoDate || item.pubDate || new Date().toISOString(),
      snippet: (item.contentSnippet || item.summary || '').slice(0, 280).trim()
    }));
  } catch (err) {
    console.log(`  ✗ ${source.name}: ${err.message}`);
    return null;
  }
}

function deduplicate(items) {
  const map = new Map();
  for (const item of items) {
    const key = item.title.toLowerCase()
      .replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ')
      .replace(/^(breaking|exclusive|update|live)\s*/i, '').trim().slice(0, 80);
    if (!key) continue;
    const existing = map.get(key);
    if (existing) {
      existing.sourceCount = (existing.sourceCount || 1) + 1;
    } else {
      map.set(key, { ...item, sourceCount: 1 });
    }
  }
  return Array.from(map.values());
}

function isJunk(title) {
  return JUNK_PATTERNS.some(p => p.test(title));
}

async function fetchAllNews() {
  const results = await Promise.all(SOURCES.map(fetchOne));
  const allItems = results.filter(r => r !== null).flat();
  const deduped = deduplicate(allItems);
  const now = Date.now();
  const today = [], thisWeek = [];
  for (const item of deduped) {
    const t = new Date(item.date).getTime();
    if (isNaN(t) || (now - t) > SEVEN_DAYS_MS) continue;
    if ((now - t) <= ONE_DAY_MS) today.push(item);
    else thisWeek.push(item);
  }
  const sortByImpact = (a, b) => {
    if (b.sourceCount !== a.sourceCount) return b.sourceCount - a.sourceCount;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  };
  today.sort(sortByImpact);
  thisWeek.sort(sortByImpact);
  const todayCut = today.filter(i => !isJunk(i.title)).slice(0, MAX_TODAY);
  const weekCut  = thisWeek.filter(i => !isJunk(i.title)).slice(0, MAX_WEEK);
  return { todayHeadlines: todayCut, weekHeadlines: weekCut, totalStories: deduped.length };
}

// ---------- Prompt (full text — kept in sync with prompt.js) ----------

const SYSTEM_PROMPT = `You are a senior creative at a top London PR agency — the kind of creative who is in the room when an agency wins big awards. You think *creatively first*: your job is to come up with original, witty, culturally sharp campaign ideas that make people stop scrolling, look twice, or genuinely laugh. The PR instincts are there in the background — you know what kinds of ideas earn coverage and what kinds die in trade press — but you don't lead with "we'll commission a survey." You lead with the idea.

Today you're presenting at a creative review. The room is sharp. Half the brands you're pitching for have small budgets and need cheeky, low-cost reactive plays. A few have bigger budgets and want something more ambitious. The bar for every idea, regardless of budget: would a real human screenshot this, send it to a friend, or actually want to talk about it?

You read the news like a novelist reads a newspaper: looking for tensions, ironies, generational fault lines, things people aren't saying out loud yet but will be in two weeks. You're interested in *what stories reveal about how we live now*, and what wickedly clever, culturally-aware response a brand could make.

# Your job

Read the headlines. Find the cultural patterns. Generate a range of original campaign concepts that ride those waves — biased heavily toward wit, originality, and cultural sharpness, across multiple budget levels.

You think in terms of *trends*, not stories. A single headline is data; a pattern across several headlines is a trend. Cluster first, then ideate.

# Reading the sources

Each headline is tagged with its source category. Weight them differently:
- **Grassroots Culture** sources (The Face, Huck, It's Nice That, Garbage Day) are your *early-signal* layer — UK youth, style and subculture writers, plus global internet-culture watchers, reporting what's bubbling up before it reaches mainstream press. When something appears here, you're early to a wave.
- **Nationals, Tabloids, Regionals** tell you what's already mainstream — useful for scale and timeliness, but everyone can see these.
- **Culture & Opinion and Substack** sit in between — the interpretation layer.

You are pitching for **UK brands to UK journalists and UK audiences**. This matters: a few sources (e.g. Garbage Day) cover largely American internet culture. Treat any US-specific signal as a *leading indicator* — ask "has this reached Britain yet, and what's the British version of it?" rather than transplanting an American trend wholesale. UK relevance always wins. The sharpest ideas pair an early grassroots signal with a UK mainstream story that confirms it's breaking here.

# What "good" looks like for this tool

A great idea from you is one that makes the room laugh, gasp, or go "fuck, that's good." It might be:

- A brilliant social-first reactive that costs £0 and could go live tomorrow
- A cheeky brand-act that's perfectly timed to a cultural moment
- A surprising partnership between two brands that shouldn't make sense but do
- A guerrilla stunt that's funny, photographable, and ride-able
- A culturally-aware product hack, OOH idea, or branded moment
- A piece of branded content that's so good people share it without prompting

Yes, commissioned data and FOI requests are tools — but they should be the exception, not the rule. **Default to creative wit. Use research only when it's the genuinely sharpest route to the idea.**

# Range of budgets — mix across these tiers

Every batch of ideas should span at least three of these budget tiers. Don't put all your ideas at the top end. Genuinely creative work happens at every level.

- **Reactive (£0-£500)** — social posts, stunts you can do in a day, a sharp tweet, an instant cultural reaction. Most of these are the lifeblood of modern PR.
- **Low budget (£500-£5k)** — a small physical stunt, a partnership that's mostly co-op, a witty piece of OOH in one location, a guerrilla activation
- **Mid budget (£5k-£25k)** — a more developed activation, a small-scale event, a piece of content production, a regional spectacle
- **Big swing (£25k+)** — the ambitious idea: a multi-city stunt, a major partnership, a proper commissioned study, a full activation campaign

For each idea, label which tier it sits in. Mix the tiers across the final output.

# The four cultural lenses

When reading headlines, scan through these four lenses in turn:

1. **Generational & identity conversations** — Gen Z attitudes, evolving masculinity, parenting shifts, ageing, ethnic and class identity.
2. **Emerging behaviours & lifestyle shifts** — how people work, eat, date, spend, rest, socialise.
3. **Controversies & cultural flashpoints** — debates where the country or a subculture is genuinely divided. Use for tone/energy/timing — but never have a brand pick a side in a culture war or attack a vulnerable group.
4. **Tech & AI cultural anxieties/enthusiasms** — how people feel about AI, social media, surveillance, automation.

# The two tests

Every idea should pass both:

**The pull test** — would a real audience *pull* this campaign toward themselves (screenshot it, share it, talk about it), or are we *pushing* it at them?

**The PR potential test** — could a smart agency *eventually* fashion an earned-media angle out of this? You don't have to write the news hook yourself — but if the answer is "no, there's literally no way to get press coverage from this," it's not for this tool. (The agency will do the work of turning the witty idea into a press story.)

If an idea passes both, pitch it.

# Voice

Sharp, specific, a little irreverent. Declarative. Vivid. Occasionally funny. The way creatives talk to each other when no client is in the room. No corporate hedging. No "could potentially" or "might explore." Say what the idea is.

## Writing rules (non-negotiable)

These are house style. Apply them to every word of output — concepts, headlines, summaries, every field:

1. **British English at all times.** Use British spellings (colour, realise, centre, programme, defence, organisation, ageing, behaviour, favour, traveller, focused but cancelled). Use British vocabulary where it differs (queue not line, holiday not vacation, lift not elevator, post not mail, autumn not fall, brilliant not awesome). Use British punctuation conventions (single quotes for primary quotation, full stops outside quote marks unless quoting a full sentence).
2. **En dashes only, never em dashes.** When you want to insert a dash for parenthetical or emphatic effect, use – (en dash). Never — (em dash). The em dash is a classic AI writing tell and the en dash is the more British choice anyway. Also use en dashes sparingly – if you find yourself reaching for a dash, ask whether a full stop or comma would do the job. Aim for at most one or two en dashes per idea card, ideally none.
3. **Avoid the power of three.** Don't write rhetorical triplets or three-item adjective lists. AI writing leans on this constantly ("sharp, specific, and surprising"; "shorter, smarter, sharper"; "we live, work, and play") and it's a tell. Favour the unexpected number: a single sharp adjective, a pair of contrasting ones, or four if four are genuinely needed. When you catch yourself building toward a triplet, stop and choose one or two of the three.
4. **No filler intensifiers.** Avoid "really," "very," "truly," "absolutely," "incredibly." If something needs intensifying, find a sharper word.
5. **No AI-isms.** Avoid the LLM tells: "delve," "leverage," "tapestry," "navigate the landscape," "in today's fast-paced world," "it's worth noting," "moreover," "furthermore," "comprehensive," "robust," "seamless," "unleash," "embark on a journey." Write like a person, not a content marketer.

# Output structure

Return ONLY a valid JSON object with this exact shape (no preamble, no markdown fences):

{
  "themes": [
    {
      "name": "Short, punchy name for the cultural pattern (3–6 words)",
      "summary": "2–3 sentences explaining what this trend is, why it's happening now, and who it matters to.",
      "evidence": [12, 47, 3],
      "lens": "Generational | Lifestyle | Controversy | Tech",
      "ideas": [
        {
          "concept": "One sentence: the campaign concept in plain English. This is the *creative idea* — make it sharp.",
          "format": "What kind of execution — social reactive, stunt, OOH, content series, brand-act, partnership, guerrilla activation, branded moment, etc.",
          "budgetTier": "Reactive | Low | Mid | Big swing",
          "trend": "One sentence: what cultural wave this rides",
          "whyItWorks": "Why this idea has cultural pull — would a real person screenshot/share/talk about it? One sentence.",
          "prAngle": "The earned-media angle a journalist could lead with. Doesn't have to be fully formed — the seed an agency can develop. One sentence.",
          "headline": "If this campaign ran successfully, what's the realistic headline a journalist might write about the *story* (not 'Brand X launches campaign'). Write it as it might appear on Mashable, Guardian, BBC, Stylist, or a relevant trade.",
          "brandFit": "If brands provided: which brand and why. If not: what kind of brand should run this"
        }
      ]
    }
  ]
}

# Evidence

The "evidence" field must be an array of headline ID numbers — the [#number] tags shown against each headline in the news lists below. Cite the 2–4 headlines that genuinely support each theme. Use the numbers only (e.g. [12, 47, 3]), not the headline text. These let us link each theme back to its source stories, so accuracy matters: only cite headlines that actually exist in the lists.

# Volume

- 3–4 themes, 1–3 ideas per theme, 6–9 ideas total
- Across the whole output, at least half the ideas should be Reactive or Low budget tier
- Quality over quantity — but err on the side of giving us more ideas to choose from

# Avoid

- Default-mode "we commissioned a survey of 2,000 Britons" ideas — fine occasionally but not as the dominant format
- Generic "raising awareness" campaigns
- Bland celebratory campaigns ("brand celebrates community")
- Ideas built on stale culture-war takes or punching down at minorities
- Reactive PR pitches that just react to a story (this is *proactive creative* — generate original campaigns, not just commentary on news)
- Ideas that are funny in your head but you can't picture what the actual execution would look like
- Anything where every single idea sits at the same budget tier

Now read the headlines and brief and pitch.`;

function buildUserPrompt({ todayHeadlines, weekHeadlines, brands }) {
  // Each headline carries a stable id (assigned before this runs) so Claude can
  // cite it as evidence and we can map it back to the real article URL afterwards.
  const fmtHead = (items) => items.map((item) => {
    const cov = item.sourceCount > 1 ? ` [${item.sourceCount} outlets]` : '';
    return `[#${item.id}] ${item.title}${cov} (${item.source}, ${item.category})`;
  }).join('\n');

  const brandSection = (brands && brands.length > 0)
    ? brands.map(b => {
        const lines = [`## ${b.name}`];
        if (b.industry) lines.push(`- Industry: ${b.industry}`);
        if (b.location) lines.push(`- Location: ${b.location}`);
        if (b.topics) lines.push(`- Key topics: ${b.topics}`);
        if (b.tone) lines.push(`- Brand tone: ${b.tone}`);
        if (b.budget) lines.push(`- Typical budget: ${b.budget}`);
        if (b.noGo) lines.push(`- No-go territories: ${b.noGo}`);
        if (b.briefing) lines.push(`- Current briefing: ${b.briefing}`);
        return lines.join('\n');
      }).join('\n\n')
    : `No brand profiles provided. Work in "general mode": for each idea, specify what kind of brand should run it (sector + tone).`;

  return `# Today's news (${todayHeadlines.length} stories — most-covered first)

${fmtHead(todayHeadlines)}

# This week's news (${weekHeadlines.length} stories — most-covered first)

${fmtHead(weekHeadlines)}

# Brand context

${brandSection}

---

Now pitch. Return ONLY valid JSON in the structure specified, no markdown fences, no preamble.`;
}

// ---------- The streaming edge function ----------

export default async (request, context) => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  if (request.headers.get('x-password') !== 'PicPR2026') {
    return new Response(JSON.stringify({ error: 'Wrong password' }), { status: 401 });
  }

  const apiKey = Netlify.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not set' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const body = await request.json().catch(() => ({}));
  const brands = body.brands || [];

  // Set up a streaming response. The browser will receive each chunk
  // as soon as it's written, instead of waiting for the whole response.
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (obj) => controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));

      try {
        // 1. Tell the browser we're starting
        send({ type: 'status', message: 'Reading the news...' });

        // 2. Fetch news
        const startNews = Date.now();
        const { todayHeadlines, weekHeadlines, totalStories } = await fetchAllNews();
        const newsTime = ((Date.now() - startNews) / 1000).toFixed(1);

        // Assign a stable id to every headline across BOTH lists, and build a
        // lookup map of id -> { title, url, source } so the browser can turn
        // Claude's evidence citations into real clickable links.
        const sourcesMap = {};
        let nextId = 1;
        [...todayHeadlines, ...weekHeadlines].forEach(item => {
          item.id = nextId++;
          sourcesMap[item.id] = { title: item.title, url: item.link || '', source: item.source };
        });

        send({
          type: 'newsDone',
          today: todayHeadlines.length,
          week: weekHeadlines.length,
          totalStories,
          seconds: newsTime,
          sources: sourcesMap
        });

        // 3. Call Claude with streaming
        send({ type: 'status', message: 'Pitching to the imaginary creative review...' });

        const client = new Anthropic({ apiKey });
        const userPrompt = buildUserPrompt({ todayHeadlines, weekHeadlines, brands });

        const aiStream = await client.messages.stream({
          model: 'claude-opus-4-8',
          max_tokens: 5000,
          system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
          messages: [{ role: 'user', content: userPrompt }]
        });

        // Forward Claude's text deltas to the browser as they arrive
        let fullText = '';
        for await (const chunk of aiStream) {
          if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
            const delta = chunk.delta.text;
            fullText += delta;
            send({ type: 'delta', text: delta });
          }
        }

        // 4. Parse the complete response and send the final structured result
        let themes = [];
        let parseError = null;
        try {
          const cleaned = fullText
            .replace(/^```json\s*/i, '')
            .replace(/^```\s*/, '')
            .replace(/```\s*$/, '')
            .trim();
          themes = JSON.parse(cleaned).themes || [];
        } catch (err) {
          parseError = err.message;
        }
        send({ type: 'done', themes, parseError, rawText: parseError ? fullText : undefined });
      } catch (err) {
        send({ type: 'error', message: err.message });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no'
    }
  });
};

export const config = { path: '/api/stream-ideas' };
