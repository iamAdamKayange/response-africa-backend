// Sample content used by `npm run seed`. Replace it with real reporting from the admin panel.
//
// Article bodies use a light text format the website understands:
//   blank line  = new paragraph
//   ## Heading  = sub-heading
//   > Quote     = pull quote

export const sections = [
  { slug: "africa", name: "Africa", description: "The continent, region by region: what is moving and why it matters." },
  { slug: "policy", name: "Policy", description: "The decisions behind the headlines, explained with clarity and context." },
  { slug: "diplomacy", name: "Diplomacy", description: "Africa's relationships with itself and the world, from summits to quiet channels." },
  { slug: "governance", name: "Governance", description: "Institutions, accountability and the everyday business of the state." },
  { slug: "business", name: "Business", description: "Markets, trade and capital: the economics shaping a continent." },
  { slug: "development", name: "Development", description: "Energy, infrastructure, climate and people: the long work of progress." },
];

const body = (topic, angle) => `Few subjects reveal the gap between announcement and outcome as clearly as ${topic}. Communiques are signed, frameworks are adopted and timelines are agreed, yet the real story is written in the months that follow: in budget lines, procurement decisions and the patience of the institutions asked to deliver.

This is where Rapid Response Africa focuses its attention: not only on what was decided, but on who decides next, what it will cost, and how the change will be felt by the people it is meant to serve.

## What has changed

The conversation around ${topic} has shifted from ambition to implementation. ${angle} Governments, regional bodies and private partners are increasingly judged by delivery rather than declarations, and that pressure is reshaping priorities across the continent.

> The measure of a policy is not the day it is announced, but the day it quietly starts to work.

## What to watch

Three signals matter most: whether financing commitments are converted into disbursements, whether regulators coordinate across borders rather than in parallel, and whether local institutions are given the capacity, not just the mandate, to carry the work forward.

None of these are headline moments. But taken together, they will determine whether today's plans become tomorrow's infrastructure. We will continue to follow the story, with context, as it develops.`;

const u = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1600&q=80`;

const a = (slug, title, dek, kicker, section, region, img, imageAlt, byline, publishedAt, topic, angle) => ({
  slug, title, dek, kicker, section, region, image: u(img), imageAlt, byline, publishedAt, body: body(topic, angle),
});

export const sampleArticles = [
  a("the-corridors-connecting-africas-next-chapter", "The corridors connecting Africa's next chapter", "Trade, infrastructure and the decisions shaping a continent.", "Trade & Development", "business", "Continental", "1578575437130-527eed3abbec", "Container cranes loading a cargo ship at a busy port", "Business Desk", "2026-10-25T07:30:00Z", "Africa's trade corridors", "Ports, rail lines and border posts are being treated less as isolated projects and more as connected systems."),
  a("inside-africas-energy-transition", "Inside Africa's energy transition", "People, policy and the infrastructure powering change.", "Energy & Development", "development", "Continental", "1509391366360-2e959784a276", "Rows of solar panels under a bright sky", "Development Desk", "2026-10-25T06:10:00Z", "the energy transition", "Distributed solar, regional power pools and new grid investments are converging."),
  a("policy-beyond-the-announcement", "Policy beyond the announcement", "Turning ambition into lasting impact across the continent.", "Policy & Governance", "policy", "Continental", "1529107386315-e1a2ed48a620", "A parliamentary chamber with rows of seats", "Policy Desk", "2026-10-24T18:45:00Z", "public policy", "Ministries are under growing pressure to publish implementation plans alongside new laws."),
  a("a-continent-in-conversation", "A continent in conversation", "Dialogue, partnerships and a more connected Africa.", "Diplomacy & Africa", "diplomacy", "Continental", "1521791136064-7986c2920216", "Two people shaking hands across a table", "Diplomacy Desk", "2026-10-24T15:20:00Z", "African diplomacy", "African states are negotiating with a wider range of partners, increasingly as blocs."),
  a("what-a-single-market-means-for-small-exporters", "What a single market means for small exporters", "Rules of origin, customs and the fine print that decides who benefits.", "Trade", "business", "West Africa", "1605745341112-85968b19335b", "A container ship sailing on open water", "Business Desk", "2026-10-24T11:05:00Z", "continental free trade", "For small exporters, the promise of a single market depends on paperwork as much as on tariffs."),
  a("power-pools-and-the-quiet-work-of-keeping-the-lights-on", "Power pools and the quiet work of keeping the lights on", "Cross-border electricity trade is maturing. Can the grids keep up?", "Infrastructure", "development", "Southern Africa", "1473341304170-971dccb5ac1e", "High-voltage power lines at sunset", "Development Desk", "2026-10-23T16:40:00Z", "regional electricity trade", "Interconnectors are only as reliable as the agreements that govern them."),
  a("the-farms-adapting-fastest-to-a-changing-climate", "The farms adapting fastest to a changing climate", "Seed systems, water and finance at the frontline of adaptation.", "Climate & Agriculture", "development", "East Africa", "1625246333195-78d9c38ad449", "Young maize plants growing in a field", "Development Desk", "2026-10-23T09:15:00Z", "climate adaptation in agriculture", "Smallholders are adopting drought-tolerant varieties, but access to credit remains the constraint."),
  a("debt-discipline-and-the-new-rules-of-borrowing", "Debt, discipline and the new rules of borrowing", "How finance ministries are rethinking the cost of capital.", "Markets & Finance", "business", "Continental", "1580519542036-c47de6196ba5", "Banknotes from several currencies spread across a table", "Business Desk", "2026-10-22T13:30:00Z", "sovereign borrowing", "Treasuries are diversifying lenders and paying closer attention to disclosure."),
  a("courts-constitutions-and-the-long-arc-of-accountability", "Courts, constitutions and the long arc of accountability", "Judicial independence is being tested and, in places, strengthened.", "Governance", "governance", "Continental", "1589829545856-d10d557cf95f", "A statue of Lady Justice holding scales", "Governance Desk", "2026-10-22T08:00:00Z", "judicial accountability", "Constitutional courts have become central arenas for settling political disputes."),
  a("a-young-continent-and-the-ballot-box", "A young continent and the ballot box", "What the world's youngest electorate expects from those it elects.", "Governance", "governance", "Continental", "1529156069898-49953e39b3ac", "A group of young people sitting together outdoors", "Governance Desk", "2026-10-21T17:10:00Z", "youth political participation", "Young voters' priorities (jobs, services and transparency) are reshaping campaigns."),
  a("building-the-digital-rails-of-public-service", "Building the digital rails of public service", "Identity, payments and data: the new infrastructure of the state.", "Policy & Technology", "policy", "East Africa", "1488590528505-98d2b5aba04b", "Lines of code on a laptop screen", "Policy Desk", "2026-10-21T10:25:00Z", "digital public infrastructure", "Interoperable identity and payment systems raise questions of privacy and oversight."),
  a("why-regional-blocs-are-becoming-first-responders", "Why regional blocs are becoming Africa's first responders", "Mediation, mandates and the limits of collective diplomacy.", "Diplomacy", "diplomacy", "Central Africa", "1450101499163-c8848c66ca85", "A hand signing a formal document", "Diplomacy Desk", "2026-10-20T14:50:00Z", "regional mediation", "Regional economic communities are increasingly first on the scene in political crises."),
  a("capturing-more-value-from-the-coffee-cup", "Capturing more value from the coffee cup", "Processing, branding and the push to keep more of the margin at home.", "Agribusiness", "business", "East Africa", "1574482620811-1aa16ffe3c82", "Hands holding freshly harvested coffee beans", "Business Desk", "2026-10-20T09:40:00Z", "agricultural value chains", "Producers are investing in roasting, certification and direct trade."),
  a("forests-finance-and-the-carbon-market-question", "Forests, finance and the carbon market question", "Who benefits when nature becomes an asset class?", "Climate", "development", "Central Africa", "1497436072909-60f360e1d4b1", "Aerial view of a dense green forest beside a river", "Development Desk", "2026-10-19T12:00:00Z", "carbon markets", "Governments are writing new rules on benefit-sharing and verification."),
  a("skills-for-an-economy-still-being-built", "Skills for an economy still being built", "Universities, apprenticeships and the jobs of the next decade.", "Education", "development", "West Africa", "1541339907198-e08756dedf3f", "Graduates throwing their caps into the air", "Development Desk", "2026-10-18T15:30:00Z", "skills and employment", "Education systems are being asked to train for industries only beginning to take shape."),
  a("deepening-the-continents-capital-markets", "Deepening the continent's capital markets", "Pension funds, exchanges and the search for long-term local capital.", "Markets", "business", "Southern Africa", "1611974789855-9c2a0a7236a3", "A stock market chart on a dark trading screen", "Business Desk", "2026-10-18T08:20:00Z", "capital market development", "Domestic institutional investors are being courted to finance infrastructure at home."),
  a("africas-cities-are-growing-up-and-out", "Africa's cities are growing up, and out", "Housing, transit and the planning decisions that last a century.", "Urban Development", "development", "Southern Africa", "1577948000111-9c970dfe3743", "A modern African city skyline under a blue sky", "Development Desk", "2026-10-17T11:45:00Z", "urbanisation", "Rapid urban growth is forcing long-lived choices on land, transport and services."),
  a("north-africa-and-the-mediterranean-energy-bridge", "North Africa and the Mediterranean energy bridge", "Wind, sun and the cables that could link two continents.", "Energy", "africa", "North Africa", "1532601224476-15c79f2f7a51", "Wind turbines on green rolling hills", "Africa Desk", "2026-10-17T07:50:00Z", "cross-Mediterranean energy links", "Renewable export projects are drawing investor attention."),
  a("the-savanna-economy", "The savanna economy: tourism, conservation and community", "Balancing livelihoods and landscapes in the continent's iconic wild places.", "Conservation", "africa", "East Africa", "1516026672322-bc52d61a55d5", "A lone acacia tree on the savanna at dusk", "Africa Desk", "2026-10-16T10:10:00Z", "conservation economics", "Community conservancies are testing models that share tourism revenue more directly."),
];

export const sampleBriefings = [
  { title: "Regional integration", region: "Continental", summary: "Trade ministers' agenda centres on customs harmonisation and digital border systems.", link: "/article/what-a-single-market-means-for-small-exporters", ago: "1 hour" },
  { title: "Energy & infrastructure", region: "Southern Africa", summary: "Utilities coordinate on cross-border supply as seasonal demand rises.", link: "/article/power-pools-and-the-quiet-work-of-keeping-the-lights-on", ago: "3 hours" },
  { title: "Diplomacy watch", region: "Central Africa", summary: "Regional envoys continue consultations ahead of a scheduled summit.", link: "/article/why-regional-blocs-are-becoming-first-responders", ago: "4 hours" },
  { title: "Markets", region: "East Africa", summary: "Currency and bond markets steady as investors await policy guidance.", ago: "1 day" },
  { title: "Governance", region: "West Africa", summary: "Electoral bodies publish updated timelines and voter-registration figures.", ago: "1 day 2 hours" },
  { title: "Climate & energy", region: "North Africa", summary: "Renewable tenders draw interest from regional and international developers.", ago: "1 day 5 hours" },
];
