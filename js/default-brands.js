/* ============================================================
   default-brands.js — Pic PR's full starter brand list

   These appear for any user loading the tool for the first time
   (or anyone who clears their localStorage). Once a user edits or
   adds brands, their changes live in their own browser only.

   To update the team-wide starter list: edit this file, commit
   to GitHub. Existing users keep their localStorage version; only
   fresh-load users see the update.

   Fields:
     name | industry | location | website | description | topics
     tone (NEW) | budget (NEW) | noGo (NEW) | briefing | active
   ============================================================ */

export const DEFAULT_BRANDS = [

  // ============================================================
  // Generic sector searches (starred — use these when no specific
  // client briefing is in play, or to spot sector-level moments)
  // ============================================================

  {
    name: '⭐ Care Sector (General)',
    industry: 'Health & Social Care',
    location: 'UK',
    website: '',
    description: 'Generic care sector search covering care homes, home care, social care policy and elderly care across the UK.',
    topics: 'care home regulation, CQC inspections, social care funding, care worker pay, dementia care, NHS winter pressures, adult social care reform, care home closures, staffing crisis, elderly care policy, home care, domiciliary care, care quality',
    tone: '', budget: '', noGo: '', briefing: '',
    active: false
  },
  {
    name: '⭐ Hospitality Sector (General)',
    industry: 'Hospitality & Leisure',
    location: 'UK',
    website: '',
    description: 'Generic hospitality sector search covering hotels, pubs, restaurants, tourism and leisure across the UK.',
    topics: 'hotel industry, pub closures, business rates hospitality, tourism data, hospitality staffing, restaurant trends, travel trends UK, UKHospitality, staycations, visitor economy, hospitality wages, hotel occupancy',
    tone: '', budget: '', noGo: '', briefing: '',
    active: false
  },
  {
    name: '⭐ Charities & Third Sector (General)',
    industry: 'Charity & Non-Profit',
    location: 'UK',
    website: '',
    description: 'Generic charity and third sector search covering fundraising, volunteering, social impact and policy.',
    topics: 'charity funding, volunteering, cost of living impact, fundraising regulation, Charity Commission, social impact, community support, charitable giving, grant funding, third sector policy',
    tone: '', budget: '', noGo: '', briefing: '',
    active: false
  },
  {
    name: '⭐ Food & Drink (General)',
    industry: 'Food & Beverage',
    location: 'UK',
    website: '',
    description: 'Generic food and drink sector search covering food safety, trends, retail and regulation.',
    topics: 'food safety, HFSS regulation, food prices, supply chain, food waste, nutrition policy, food labelling, allergen regulation, food trends, plant-based, food retail, grocery',
    tone: '', budget: '', noGo: '', briefing: '',
    active: false
  },

  // ============================================================
  // Named Pic PR clients (alphabetical by name within sector groups)
  // ============================================================

  {
    name: 'Pic PR',
    industry: 'PR & Communications',
    location: 'Worcestershire',
    website: 'https://www.picpr.com',
    description: 'Full-service PR agency specialising in hospitality, care and consumer brands.',
    topics: 'PR industry trends, communications, agency news, creative campaigns, brand strategy, media relations',
    tone: '', budget: '', noGo: '', briefing: '',
    active: false
  },

  // ----- Hospitality -----
  {
    name: 'HOSPA & HMA',
    industry: 'Hospitality & Leisure',
    location: 'UK',
    website: '',
    description: 'Hospitality professionals association covering finance, revenue management and IT.',
    topics: 'hotel revenue management, hospitality finance, hotel technology, hospitality KPIs, hotel benchmarking, hospitality industry data, hotel profitability',
    tone: '', budget: '', noGo: '', briefing: '',
    active: false
  },
  {
    name: 'Net Affinity',
    industry: 'Hospitality Technology',
    location: 'Ireland / UK',
    website: '',
    description: 'Hotel booking technology and direct booking solutions.',
    topics: 'hotel direct bookings, hospitality technology, hotel revenue, OTA commission, hotel website conversion, booking engine, hotel digital marketing',
    tone: '', budget: '', noGo: '', briefing: '',
    active: false
  },
  {
    name: 'Kensington Hideaway',
    industry: 'Hospitality & Leisure',
    location: 'London',
    website: '',
    description: 'Boutique luxury accommodation in Kensington, London.',
    topics: 'London tourism, luxury travel, boutique hotels London, staycations, Kensington, London events, luxury short stays',
    tone: '', budget: '', noGo: '', briefing: '',
    active: false
  },
  {
    name: 'OSS Systems',
    industry: 'Hospitality Technology',
    location: 'UK',
    website: '',
    description: 'Technology solutions for hospitality and leisure businesses.',
    topics: 'hospitality technology, hotel PMS, restaurant EPOS, hospitality operations, hotel systems, leisure management software',
    tone: '', budget: '', noGo: '', briefing: '',
    active: false
  },
  {
    name: 'Murrayshall',
    industry: 'Hospitality & Leisure',
    location: 'Perthshire, Scotland',
    website: '',
    description: 'Country house hotel and golf estate in Scotland.',
    topics: 'Scottish tourism, golf tourism, luxury hotels Scotland, country house hotels, Perthshire, wedding venues Scotland, Scottish golf',
    tone: '', budget: '', noGo: '', briefing: '',
    active: false
  },
  {
    name: 'Headlam Hall + Rose & Crown',
    industry: 'Hospitality & Leisure',
    location: 'County Durham',
    website: '',
    description: 'Country house hotel and spa with associated gastropub (the Rose & Crown is owned by the hotel) in the North East.',
    topics: 'North East tourism, country house hotels, spa breaks, gastropubs, country pubs, County Durham, rural hospitality, North East food scene',
    tone: '', budget: '', noGo: '', briefing: '',
    active: false
  },
  {
    name: 'The Wesley',
    industry: 'Hospitality & Leisure',
    location: 'London',
    website: '',
    description: 'Hotel and conference venue in London.',
    topics: 'London hotels, conference venues, business travel, event spaces, London meetings, corporate hospitality',
    tone: '', budget: '', noGo: '', briefing: '',
    active: false
  },
  {
    name: 'Horwood House',
    industry: 'Hospitality & Leisure',
    location: 'Buckinghamshire',
    website: '',
    description: 'Country house hotel, spa and events venue.',
    topics: 'country house hotels, wedding venues, spa breaks, corporate events, Buckinghamshire, rural retreats',
    tone: '', budget: '', noGo: '', briefing: '',
    active: false
  },
  {
    name: 'Orchardleigh',
    industry: 'Hospitality & Leisure',
    location: 'Somerset',
    website: '',
    description: 'Estate venue for weddings, events and luxury stays.',
    topics: 'wedding venues, country estates, luxury events, Somerset tourism, exclusive hire, estate weddings, outdoor weddings',
    tone: '', budget: '', noGo: '', briefing: '',
    active: false
  },

  // ----- Care -----
  {
    name: 'Macc Care Group',
    industry: 'Health & Social Care',
    location: 'Macclesfield, Cheshire',
    website: '',
    description: 'Care home group providing residential and nursing care in Cheshire.',
    topics: 'care home regulation, CQC, elderly care, social care staffing, dementia care, Cheshire care, care home funding, nurse recruitment',
    tone: '', budget: '', noGo: '', briefing: '',
    active: false
  },
  {
    name: 'Sona (Care)',
    industry: 'Health & Social Care Technology',
    location: 'UK',
    website: '',
    description: 'Workforce management technology for the care sector.',
    topics: 'care staff scheduling, care worker retention, social care workforce, care technology, staff wellbeing, agency staff costs, shift management',
    tone: '', budget: '', noGo: '', briefing: '',
    active: false
  },
  {
    name: 'Church Farm Care',
    industry: 'Health & Social Care',
    location: 'Nottinghamshire',
    website: '',
    description: 'Care home provider offering residential and nursing care.',
    topics: 'care home quality, CQC ratings, elderly care, dementia care, Nottinghamshire care, person-centred care',
    tone: '', budget: '', noGo: '', briefing: '',
    active: false
  },
  {
    name: 'Milford Care',
    industry: 'Health & Social Care',
    location: 'UK',
    website: '',
    description: 'Care home operator providing residential and nursing care.',
    topics: 'care home standards, elderly care, nursing care, social care policy, care home life, resident wellbeing',
    tone: '', budget: '', noGo: '', briefing: '',
    active: false
  },
  {
    name: 'Autumna',
    industry: 'Health & Social Care Technology',
    location: 'UK',
    website: '',
    description: 'Care home comparison and transparency platform including OpenScore ratings.',
    topics: 'care home ratings, care home comparison, CQC data, care transparency, choosing a care home, care home fees, care directory',
    tone: '', budget: '', noGo: '', briefing: '',
    active: false
  },
  {
    name: 'Coxbench Hall',
    industry: 'Health & Social Care',
    location: 'Derbyshire',
    website: '',
    description: 'Care home providing residential care in a historic setting.',
    topics: 'care home quality, residential care, elderly care, CQC, Derbyshire care, heritage buildings care',
    tone: '', budget: '', noGo: '', briefing: '',
    active: false
  },
  {
    name: 'CoolCare',
    industry: 'Health & Social Care Technology',
    location: 'UK',
    website: '',
    description: 'Occupancy and business management software for care homes.',
    topics: 'care home occupancy, care home management, care business data, care technology, care home profitability, bed occupancy rates',
    tone: '', budget: '', noGo: '', briefing: '',
    active: false
  },
  {
    name: 'Nellsar',
    industry: 'Health & Social Care',
    location: 'South East England',
    website: '',
    description: 'Care home group operating residential and nursing homes across the South East.',
    topics: 'care home activities, elderly care, dementia care, CQC ratings, care home community, intergenerational care, South East care',
    tone: '', budget: '', noGo: '', briefing: '',
    active: false
  },
  {
    name: 'Park View Gloucester',
    industry: 'Health & Social Care',
    location: 'Gloucester',
    website: '',
    description: 'Care home providing residential and nursing care.',
    topics: 'care home quality, elderly care Gloucestershire, nursing care, CQC, Gloucester care homes',
    tone: '', budget: '', noGo: '', briefing: '',
    active: false
  },
  {
    name: 'Cinnamon Care',
    industry: 'Health & Social Care',
    location: 'UK',
    website: '',
    description: 'Care home group providing premium residential, nursing and dementia care across the UK.',
    topics: 'care home quality, premium care, elderly care, dementia care, nursing care, CQC ratings, care home design, luxury care',
    tone: '', budget: '', noGo: '', briefing: '',
    active: false
  },
  {
    name: 'Wellbeing Care',
    industry: 'Health & Social Care',
    location: 'UK',
    website: '',
    description: 'Care provider focused on wellbeing-led care services.',
    topics: 'elderly wellbeing, care home innovation, person-centred care, mental health in care, activities in care, holistic care',
    tone: '', budget: '', noGo: '', briefing: '',
    active: false
  },
  {
    name: 'You & I Care',
    industry: 'Health & Social Care',
    location: 'UK',
    website: '',
    description: 'Home care and domiciliary care provider.',
    topics: 'home care, domiciliary care, care at home, live-in care, care worker recruitment, home care regulation, CQC home care',
    tone: '', budget: '', noGo: '', briefing: '',
    active: false
  },
  {
    name: 'Venelle',
    industry: 'Health & Social Care',
    location: 'UK',
    website: '',
    description: 'Luxury home care and domiciliary care provider.',
    topics: 'luxury home care, private care, domiciliary care, elderly care at home, premium care, private nursing, high-net-worth care',
    tone: '', budget: '', noGo: '', briefing: '',
    active: false
  },
  {
    name: 'Clearstone Care',
    industry: 'Health & Social Care',
    location: 'UK',
    website: '',
    description: 'Care home group providing residential and nursing care.',
    topics: 'care home quality, CQC, elderly care, dementia care, care staffing, social care policy, care home standards',
    tone: '', budget: '', noGo: '', briefing: '',
    active: false
  },
  {
    name: 'everyLIFE',
    industry: 'Health & Social Care Technology',
    location: 'UK',
    website: '',
    description: 'Digital care planning and records platform for care providers.',
    topics: 'digital care records, care planning technology, CQC compliance, paperless care, care home tech, digital transformation care',
    tone: '', budget: '', noGo: '', briefing: '',
    active: false
  },

  // ----- Charity / Third sector -----
  {
    name: 'WellChild',
    industry: 'Charity & Non-Profit',
    location: 'UK',
    website: '',
    description: 'National charity for seriously ill children helping them get the best care.',
    topics: "children's health, seriously ill children, family support, NHS children's services, palliative care, children's nursing, young carers",
    tone: '', budget: '', noGo: '', briefing: '',
    active: false
  },
  {
    name: 'White Ribbon UK',
    industry: 'Charity & Non-Profit',
    location: 'UK',
    website: '',
    description: 'Charity working to end male violence against women through education and campaigning.',
    topics: 'violence against women, VAWG, domestic abuse, gender equality, safeguarding, male allies, consent education, White Ribbon Day',
    tone: '', budget: '', noGo: '', briefing: '',
    active: false
  },

  // ----- Consumer / Retail -----
  {
    name: 'DK Household Brands — Zyliss',
    industry: 'Consumer & Retail',
    location: 'UK',
    website: '',
    description: 'Kitchen gadgets and cookware brand.',
    topics: 'kitchen trends, cooking, food preparation, kitchenware, home cooking, kitchen innovation, cookware, gadgets',
    tone: '', budget: '', noGo: '', briefing: '',
    active: false
  },
  {
    name: 'DK Household Brands — Cole & Mason',
    industry: 'Consumer & Retail',
    location: 'UK',
    website: '',
    description: 'Premium salt and pepper mills and seasoning brand.',
    topics: 'cooking, seasoning, kitchen accessories, food trends, home dining, spices, entertaining at home',
    tone: '', budget: '', noGo: '', briefing: '',
    active: false
  },

  // ----- Other -----
  {
    name: 'RAW Charging',
    industry: 'Electric Vehicles & Sustainability',
    location: 'UK',
    website: '',
    description: 'Electric vehicle charging network and infrastructure provider.',
    topics: 'EV charging, electric vehicles, sustainability, net zero, green transport, EV infrastructure, charging network, fleet electrification',
    tone: '', budget: '', noGo: '', briefing: '',
    active: false
  },
  {
    name: 'Midhurst Jazz Food & Blues Festival',
    industry: 'Events & Entertainment',
    location: 'Midhurst, West Sussex',
    website: '',
    description: 'Annual jazz, food and blues festival.',
    topics: 'music festivals, food festivals, live music, West Sussex events, cultural events, festival season, outdoor events',
    tone: '', budget: '', noGo: '', briefing: '',
    active: false
  }

];
