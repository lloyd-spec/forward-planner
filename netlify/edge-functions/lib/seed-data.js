// Seed data for the Forward Planner.
// v5: every event classified by provenance: official | charity | cultural | industry | commercial.

export const SEED_EVENTS = [
  {
    "date": "01-01",
    "event": "New Year's Day",
    "category": "Cultural",
    "description": "Start of the calendar year. Resolutions, fresh starts.",
    "relevantFor": "Health, fitness, finance, lifestyle, hospitality",
    "notes": "Resolutions angle, 'year of...' predictions",
    "provenance": "cultural"
  },
  {
    "date": "01-04",
    "event": "World Braille Day",
    "category": "Awareness",
    "description": "UN day marking the birth of Louis Braille.",
    "relevantFor": "Charity, accessibility, education, tech",
    "notes": "Accessibility commitments, blind/visually impaired employees",
    "provenance": "official"
  },
  {
    "date": "3:mon:01",
    "event": "Blue Monday (3rd Monday)",
    "category": "Cultural",
    "description": "Supposedly the most depressing day of the year. Mostly marketing, but huge media interest.",
    "relevantFor": "Mental health, wellness, hospitality, retail, HR",
    "notes": "Wellbeing initiatives, expert commentary debunking it",
    "provenance": "commercial"
  },
  {
    "date": "01-25",
    "event": "Burns Night",
    "category": "Cultural",
    "description": "Scottish poet Robert Burns celebrated with suppers, whisky, haggis.",
    "relevantFor": "Hospitality, food & drink, Scottish brands, tourism",
    "notes": "Scottish heritage, whisky pairings, supper menu features",
    "provenance": "cultural"
  },
  {
    "date": "01-27",
    "event": "Holocaust Memorial Day",
    "category": "Awareness",
    "description": "UK day of remembrance. Sensitive — comment only with substance.",
    "relevantFor": "Charity, education, museums (handle with extreme care)",
    "notes": "Only react if client has genuine, substantive contribution",
    "provenance": "official"
  },
  {
    "date": "02-01",
    "event": "LGBT+ History Month begins",
    "category": "Awareness",
    "description": "UK month-long observance.",
    "relevantFor": "Charity, HR, brands with diversity work, education",
    "notes": "Authentic D&I stories, not rainbow-washing",
    "duration": 28,
    "provenance": "cultural"
  },
  {
    "date": "02-04",
    "event": "World Cancer Day",
    "category": "Awareness",
    "description": "Global UICC awareness day.",
    "relevantFor": "Healthcare, charity, wellness, employers",
    "notes": "Workplace screening programmes, survivor stories",
    "provenance": "charity"
  },
  {
    "date": "1:thu:02",
    "event": "Time to Talk Day (1st Thurs Feb)",
    "category": "Awareness",
    "description": "Mind/Rethink mental health conversation day.",
    "relevantFor": "Mental health, HR, workplaces, hospitality",
    "notes": "Workplace conversation initiatives, manager training",
    "provenance": "charity"
  },
  {
    "date": "02-14",
    "event": "Valentine's Day",
    "category": "Seasonal/Retail",
    "description": "Romance, dining out, gifting peak.",
    "relevantFor": "Hospitality, retail, food & drink, jewellery, florists",
    "notes": "Anti-Valentine angles often outperform standard ones",
    "provenance": "cultural"
  },
  {
    "date": "02-22",
    "event": "Six Nations Rugby (approx)",
    "category": "Sport",
    "description": "Annual Six Nations tournament runs Feb-Mar.",
    "relevantFor": "Sports, hospitality, food & drink, pubs/venues",
    "notes": "Match-day menus, venue bookings, expert commentary",
    "duration": 49,
    "provenance": "cultural"
  },
  {
    "date": "03-01",
    "event": "St David's Day",
    "category": "Cultural",
    "description": "Welsh national day.",
    "relevantFor": "Welsh brands, hospitality, tourism, food",
    "notes": "Welsh produce, heritage stories",
    "provenance": "cultural"
  },
  {
    "date": "03-03",
    "event": "World Wildlife Day",
    "category": "Awareness",
    "description": "UN day for flora and fauna.",
    "relevantFor": "Sustainability, conservation, outdoor brands, hospitality (estates)",
    "notes": "Biodiversity initiatives, rewilding stories",
    "provenance": "official"
  },
  {
    "date": "1:thu:03",
    "event": "World Book Day (1st Thurs March)",
    "category": "Awareness",
    "description": "Major UK media moment with schools.",
    "relevantFor": "Publishing, education, retail, family brands",
    "notes": "Author features, costume ideas, reading initiatives",
    "provenance": "charity"
  },
  {
    "date": "03-08",
    "event": "International Women's Day",
    "category": "Awareness",
    "description": "Global. Very crowded — needs strong angle.",
    "relevantFor": "Most B2B and B2C — but cynical media scrutiny",
    "notes": "Substantive D&I commitments, female leader features, avoid pinkwashing",
    "provenance": "official"
  },
  {
    "date": "03-14",
    "event": "Comic Relief / Red Nose Day (mid-March, biennial)",
    "category": "Cultural",
    "description": "Major UK charity TV event.",
    "relevantFor": "Charity, brands with CSR partnerships",
    "notes": "Fundraising activities, partnership stories",
    "provenance": "charity"
  },
  {
    "date": "03-17",
    "event": "St Patrick's Day",
    "category": "Cultural",
    "description": "Irish celebration, big in hospitality.",
    "relevantFor": "Hospitality, food & drink, Irish brands, pubs",
    "notes": "Menu features, Guinness/whiskey content",
    "provenance": "cultural"
  },
  {
    "date": "03-20",
    "event": "International Day of Happiness",
    "category": "Awareness",
    "description": "UN day.",
    "relevantFor": "Wellness, mental health, hospitality, lifestyle",
    "notes": "Workplace happiness data, wellbeing stories",
    "provenance": "official"
  },
  {
    "date": "03-21",
    "event": "World Down Syndrome Day",
    "category": "Awareness",
    "description": "UN awareness day.",
    "relevantFor": "Charity, healthcare, employers, education",
    "notes": "Inclusive employment stories",
    "provenance": "official"
  },
  {
    "date": "03-22",
    "event": "Mother's Day (4th Sunday Lent — UK)",
    "category": "Seasonal/Retail",
    "description": "Major UK gifting and hospitality moment.",
    "relevantFor": "Hospitality, retail, jewellery, beauty, florists, gifting",
    "notes": "Floating: Mothering Sunday moves with Easter, confirm the exact date each year. UK Mothering Sunday. US Mother's Day falls in May; never conflate the two. Brunch menus, gift guides, mother-daughter stories",
    "provenance": "cultural"
  },
  {
    "date": "last:sun:03",
    "event": "British Summer Time begins (last Sun March)",
    "category": "Seasonal",
    "description": "Clocks go forward.",
    "relevantFor": "Hospitality (outdoor), retail, tourism, sleep brands",
    "notes": "Spring openings, lighter evenings, sleep impact",
    "provenance": "cultural"
  },
  {
    "date": "04-02",
    "event": "World Autism Awareness Day",
    "category": "Awareness",
    "description": "UN day.",
    "relevantFor": "Charity, HR, education, retail (quiet hours)",
    "notes": "Neurodiversity hiring, sensory-friendly initiatives",
    "provenance": "official"
  },
  {
    "date": "04-07",
    "event": "World Health Day",
    "category": "Awareness",
    "description": "WHO global day.",
    "relevantFor": "Healthcare, wellness, food brands, employers",
    "notes": "Workplace health programmes, expert commentary",
    "provenance": "official"
  },
  {
    "date": "04-22",
    "event": "Earth Day",
    "category": "Awareness",
    "description": "Global environmental day.",
    "relevantFor": "Sustainability, B Corps, hospitality, retail",
    "notes": "Substantive sustainability announcements only",
    "provenance": "official"
  },
  {
    "date": "04-23",
    "event": "St George's Day / Shakespeare's birthday",
    "category": "Cultural",
    "description": "English national day, Shakespeare anniversary.",
    "relevantFor": "Hospitality, food & drink, English heritage, arts",
    "notes": "English produce, literary tie-ins",
    "provenance": "cultural"
  },
  {
    "date": "last:sun:04",
    "event": "London Marathon (last Sun April)",
    "category": "Sport",
    "description": "Major UK sporting and charity event.",
    "relevantFor": "Sport, charity, health, hospitality, fitness",
    "notes": "Runner stories, charity fundraising, expert advice",
    "provenance": "cultural"
  },
  {
    "date": "05-04",
    "event": "Star Wars Day ('May the 4th')",
    "category": "Cultural",
    "description": "Internet-fuelled fan day, light-hearted.",
    "relevantFor": "Retail, hospitality, entertainment, family brands",
    "notes": "Playful tie-ins, themed menus/products",
    "provenance": "commercial"
  },
  {
    "date": "1:mon:05",
    "event": "Early May Bank Holiday (1st Mon)",
    "category": "Seasonal",
    "description": "UK bank holiday weekend.",
    "relevantFor": "Hospitality, tourism, retail, DIY, garden",
    "notes": "Weekend break content, BBQ guides",
    "provenance": "cultural"
  },
  {
    "date": "05-12",
    "event": "Mental Health Awareness Week (mid-May)",
    "category": "Awareness",
    "description": "Mind / Mental Health Foundation week.",
    "relevantFor": "Mental health, HR, hospitality, healthcare",
    "notes": "Workplace initiatives, expert columns",
    "duration": 7,
    "provenance": "charity"
  },
  {
    "date": "05-15",
    "event": "Eurovision Song Contest (mid-May)",
    "category": "Cultural",
    "description": "Huge UK TV moment, party-friendly.",
    "relevantFor": "Hospitality, food & drink, retail, LGBT+ angles",
    "notes": "Watch-party menus, predictions, fashion",
    "provenance": "cultural"
  },
  {
    "date": "last:mon:05",
    "event": "Spring Bank Holiday (last Mon)",
    "category": "Seasonal",
    "description": "UK bank holiday.",
    "relevantFor": "Hospitality, tourism, retail, gardening",
    "notes": "Long weekend content",
    "provenance": "cultural"
  },
  {
    "date": "05-26",
    "event": "Chelsea Flower Show (late May)",
    "category": "Cultural",
    "description": "Major RHS garden event.",
    "relevantFor": "Garden, lifestyle, hospitality (estates), interiors",
    "notes": "Garden trends, expert commentary",
    "duration": 5,
    "provenance": "cultural"
  },
  {
    "date": "06-01",
    "event": "Pride Month begins",
    "category": "Awareness",
    "description": "Global LGBT+ celebration month.",
    "relevantFor": "Brands with genuine D&I work, hospitality, retail",
    "notes": "Substance over rainbow logos — media is critical",
    "duration": 30,
    "provenance": "cultural"
  },
  {
    "date": "06-05",
    "event": "World Environment Day",
    "category": "Awareness",
    "description": "UN day.",
    "relevantFor": "Sustainability, B Corps, hospitality, retail",
    "notes": "Substantive environmental announcements",
    "provenance": "official"
  },
  {
    "date": "06-08",
    "event": "World Oceans Day",
    "category": "Awareness",
    "description": "UN day.",
    "relevantFor": "Sustainability, seafood, coastal tourism, beauty (reef-safe)",
    "notes": "Plastic reduction, ocean conservation",
    "provenance": "official"
  },
  {
    "date": "2:sat:06",
    "event": "Trooping the Colour / King's Birthday Parade",
    "category": "Cultural",
    "description": "UK royal event.",
    "relevantFor": "Hospitality, tourism, British heritage brands",
    "notes": "Royal-themed content, celebratory menus",
    "provenance": "official"
  },
  {
    "date": "3:sun:06",
    "event": "Father's Day (3rd Sunday)",
    "category": "Seasonal/Retail",
    "description": "Gifting and hospitality moment.",
    "relevantFor": "Hospitality, retail, grooming, food & drink, gifting",
    "notes": "Gift guides, father-figure stories",
    "provenance": "cultural"
  },
  {
    "date": "06-21",
    "event": "Summer Solstice / Longest Day",
    "category": "Seasonal",
    "description": "Astronomical event, Stonehenge moment.",
    "relevantFor": "Hospitality, wellness, outdoor brands, tourism",
    "notes": "Late-evening events, light-themed content",
    "provenance": "cultural"
  },
  {
    "date": "06-23",
    "event": "Wimbledon begins (late June)",
    "category": "Sport",
    "description": "Major UK sporting moment, fashion+food crossover.",
    "relevantFor": "Sport, hospitality, food & drink (strawberries!), fashion, retail",
    "notes": "Strawberries & cream features, fashion, expert picks",
    "duration": 14,
    "provenance": "cultural"
  },
  {
    "date": "06-27",
    "event": "Glastonbury Festival (late June)",
    "category": "Cultural",
    "description": "Major UK festival, ~5 days media saturation.",
    "relevantFor": "Music, fashion, hospitality, food & drink, retail",
    "notes": "Festival fashion, food trends, alternative content",
    "duration": 5,
    "provenance": "cultural"
  },
  {
    "date": "last:sat:06",
    "event": "Armed Forces Day (last Sat June)",
    "category": "Awareness",
    "description": "UK day honouring military.",
    "relevantFor": "Charity (forces), employers, hospitality",
    "notes": "Veteran employment, forces charity partnerships",
    "provenance": "official"
  },
  {
    "date": "07-04",
    "event": "American Independence Day",
    "category": "Cultural",
    "description": "US national day, hospitality angle in UK.",
    "relevantFor": "Hospitality (US-themed), food & drink, retail",
    "notes": "American menus, BBQ content",
    "provenance": "cultural"
  },
  {
    "date": "07-05",
    "event": "NHS Birthday",
    "category": "Cultural",
    "description": "UK National Health Service anniversary.",
    "relevantFor": "Healthcare, charity, employers, public sector",
    "notes": "NHS staff stories, healthcare commentary",
    "provenance": "official"
  },
  {
    "date": "07-15",
    "event": "St Swithin's Day",
    "category": "Cultural",
    "description": "UK weather folklore — 40 days of rain or sun.",
    "relevantFor": "Hospitality, tourism, retail, gardening",
    "notes": "Weather-themed content, light folklore",
    "provenance": "cultural"
  },
  {
    "date": "07-17",
    "event": "The Open Championship (mid-July)",
    "category": "Sport",
    "description": "Major golf championship.",
    "relevantFor": "Sport, hospitality, food & drink, Scottish/coastal",
    "notes": "Tournament hospitality, expert picks",
    "provenance": "cultural"
  },
  {
    "date": "07-19",
    "event": "School summer holidays begin (approx)",
    "category": "Seasonal",
    "description": "UK family travel and leisure peak.",
    "relevantFor": "Hospitality, tourism, retail (family), food & drink",
    "notes": "Family content, holiday ideas, activities",
    "provenance": "cultural"
  },
  {
    "date": "07-30",
    "event": "International Day of Friendship",
    "category": "Awareness",
    "description": "UN day.",
    "relevantFor": "Hospitality, lifestyle, retail, social brands",
    "notes": "Group dining, gifting, social content",
    "provenance": "official"
  },
  {
    "date": "08-01",
    "event": "Yorkshire Day",
    "category": "Cultural",
    "description": "Yorkshire celebration.",
    "relevantFor": "Yorkshire brands, hospitality, food & drink, tourism",
    "notes": "Yorkshire produce and pride stories",
    "provenance": "cultural"
  },
  {
    "date": "08-04",
    "event": "Edinburgh Fringe begins (early Aug)",
    "category": "Cultural",
    "description": "World's largest arts festival.",
    "relevantFor": "Arts, hospitality, Scottish brands, tourism",
    "notes": "Festival picks, hospitality offers",
    "duration": 25,
    "provenance": "cultural"
  },
  {
    "date": "08-12",
    "event": "International Youth Day",
    "category": "Awareness",
    "description": "UN day.",
    "relevantFor": "Charity, education, employers, youth brands",
    "notes": "Youth employment, apprenticeships",
    "provenance": "official"
  },
  {
    "date": "08-19",
    "event": "World Photography Day",
    "category": "Awareness",
    "description": "Cultural day.",
    "relevantFor": "Tech, retail, arts, hospitality (locations)",
    "notes": "Photography contests, location features",
    "provenance": "commercial"
  },
  {
    "date": "last:mon:08",
    "event": "August Bank Holiday (last Mon)",
    "category": "Seasonal",
    "description": "Final summer bank holiday.",
    "relevantFor": "Hospitality, tourism, retail, food & drink",
    "notes": "End of summer content, BBQ, festivals",
    "provenance": "cultural"
  },
  {
    "date": "last:sun:08",
    "event": "Notting Hill Carnival (Aug BH weekend)",
    "category": "Cultural",
    "description": "Major UK street festival, Caribbean culture.",
    "relevantFor": "Hospitality, food & drink, music, retail, fashion",
    "notes": "Caribbean food, carnival culture, London hospitality",
    "duration": 2,
    "provenance": "cultural"
  },
  {
    "date": "09-01",
    "event": "Back to School / Back to Work peak",
    "category": "Seasonal/Retail",
    "description": "Major retail and lifestyle moment.",
    "relevantFor": "Retail, education, employers, food (lunchbox), tech",
    "notes": "Lunchbox content, productivity, parent guides",
    "provenance": "cultural"
  },
  {
    "date": "09-08",
    "event": "International Literacy Day",
    "category": "Awareness",
    "description": "UN day.",
    "relevantFor": "Education, publishing, charity, employers",
    "notes": "Workplace literacy, reading initiatives",
    "provenance": "official"
  },
  {
    "date": "09-10",
    "event": "World Suicide Prevention Day",
    "category": "Awareness",
    "description": "Sensitive but important.",
    "relevantFor": "Mental health, healthcare, employers, charity",
    "notes": "Workplace mental health, with care and links to support",
    "provenance": "official"
  },
  {
    "date": "09-15",
    "event": "London Fashion Week (mid-Sep)",
    "category": "Cultural",
    "description": "Major fashion industry moment.",
    "relevantFor": "Fashion, retail, beauty, hospitality, luxury",
    "notes": "Trend coverage, designer features",
    "duration": 5,
    "provenance": "industry"
  },
  {
    "date": "09-21",
    "event": "International Day of Peace",
    "category": "Awareness",
    "description": "UN day.",
    "relevantFor": "Charity, NGOs, conflict-affected sectors",
    "notes": "Peace-related CSR work",
    "provenance": "official"
  },
  {
    "date": "09-22",
    "event": "Autumn Equinox",
    "category": "Seasonal",
    "description": "Start of autumn.",
    "relevantFor": "Hospitality, food & drink, fashion, lifestyle",
    "notes": "Autumn menus, seasonal shift content",
    "provenance": "cultural"
  },
  {
    "date": "last:fri:09",
    "event": "Macmillan Coffee Morning (last Friday)",
    "category": "Awareness",
    "description": "Major UK charity event.",
    "relevantFor": "Charity, hospitality, employers, food & drink",
    "notes": "Workplace coffee mornings, baking content",
    "provenance": "charity"
  },
  {
    "date": "10-01",
    "event": "Black History Month begins (UK)",
    "category": "Awareness",
    "description": "UK month-long observance.",
    "relevantFor": "Employers with genuine D&I, education, charity, arts",
    "notes": "Authentic stories, not tokenism — media is critical",
    "duration": 31,
    "provenance": "cultural"
  },
  {
    "date": "10-01",
    "event": "International Day of Older Persons",
    "category": "Awareness",
    "description": "UN day.",
    "relevantFor": "Care, healthcare, charity, financial services",
    "notes": "Ageing population stories, care sector commentary",
    "provenance": "official"
  },
  {
    "date": "10-04",
    "event": "World Animal Day",
    "category": "Awareness",
    "description": "Global animal welfare day.",
    "relevantFor": "Pet, charity, sustainability, food brands",
    "notes": "Animal welfare commitments, rescue stories",
    "provenance": "official"
  },
  {
    "date": "10-10",
    "event": "World Mental Health Day",
    "category": "Awareness",
    "description": "Major global day. Crowded — needs substance.",
    "relevantFor": "Mental health, HR, healthcare, all employers",
    "notes": "Workplace initiatives, expert commentary, real stories",
    "provenance": "official"
  },
  {
    "date": "10-16",
    "event": "World Food Day",
    "category": "Awareness",
    "description": "UN day, FAO.",
    "relevantFor": "Food & drink, hospitality, retail, charity",
    "notes": "Food waste, sustainable sourcing, hunger charities",
    "provenance": "official"
  },
  {
    "date": "last:sun:10",
    "event": "British Summer Time ends (last Sun Oct)",
    "category": "Seasonal",
    "description": "Clocks go back.",
    "relevantFor": "Hospitality, retail, sleep, hygge brands, lighting",
    "notes": "Cosy season, sleep impact, hygge content",
    "provenance": "cultural"
  },
  {
    "date": "10-31",
    "event": "Halloween",
    "category": "Seasonal/Retail",
    "description": "Major retail and hospitality moment.",
    "relevantFor": "Retail, hospitality, food & drink, family, beauty",
    "notes": "Costume trends, themed menus, family activities",
    "provenance": "cultural"
  },
  {
    "date": "11-05",
    "event": "Bonfire Night / Guy Fawkes",
    "category": "Cultural",
    "description": "UK fireworks and bonfire tradition.",
    "relevantFor": "Hospitality, food & drink, pet (anxiety angle), safety",
    "notes": "Sparkler menus, pet safety, community events",
    "provenance": "cultural"
  },
  {
    "date": "11-11",
    "event": "Remembrance Day / Armistice",
    "category": "Cultural",
    "description": "UK day of remembrance. Sensitive.",
    "relevantFor": "Charity (forces), employers — handle with care",
    "notes": "Two-minute silence observance, only substantive contributions",
    "provenance": "official"
  },
  {
    "date": "11-13",
    "event": "World Kindness Day",
    "category": "Awareness",
    "description": "Global day.",
    "relevantFor": "Hospitality, retail, charity, employers",
    "notes": "Random acts of kindness initiatives",
    "provenance": "charity"
  },
  {
    "date": "11-14",
    "event": "World Diabetes Day",
    "category": "Awareness",
    "description": "Major health day.",
    "relevantFor": "Healthcare, food & drink, fitness, charity",
    "notes": "Health screening, nutrition stories",
    "provenance": "official"
  },
  {
    "date": "11-19",
    "event": "International Men's Day",
    "category": "Awareness",
    "description": "Global day, often overlooked.",
    "relevantFor": "Men's health, charity, grooming, employers",
    "notes": "Men's mental health, prostate cancer awareness",
    "provenance": "official"
  },
  {
    "date": "11-25",
    "event": "Autumn Budget (approx, varies)",
    "category": "Political/Economic",
    "description": "Major UK fiscal moment.",
    "relevantFor": "Finance, business, hospitality, property, retail",
    "notes": "Sector reactions, expert commentary, business impact",
    "provenance": "official"
  },
  {
    "date": "4:fri:11",
    "event": "Black Friday (4th Friday)",
    "category": "Seasonal/Retail",
    "description": "Major retail discount day.",
    "relevantFor": "Retail, e-commerce, finance, tech, hospitality (deals)",
    "notes": "Anti-Black Friday angles often outperform deals",
    "provenance": "commercial"
  },
  {
    "date": "1:sat:12",
    "event": "Small Business Saturday (1st Sat December, UK)",
    "category": "Awareness",
    "description": "Independent business support day.",
    "relevantFor": "Retail, hospitality, B2B, charity",
    "notes": "UK date is the first Saturday of December, a week after the US edition. Indie business stories, support local content",
    "provenance": "industry"
  },
  {
    "date": "11-30",
    "event": "St Andrew's Day",
    "category": "Cultural",
    "description": "Scottish national day.",
    "relevantFor": "Scottish brands, hospitality, food & drink, tourism",
    "notes": "Scottish produce, heritage stories",
    "provenance": "cultural"
  },
  {
    "date": "12-01",
    "event": "World AIDS Day",
    "category": "Awareness",
    "description": "UN day.",
    "relevantFor": "Healthcare, charity, LGBT+ brands, employers",
    "notes": "Substantive — not lip service",
    "provenance": "official"
  },
  {
    "date": "12-03",
    "event": "International Day of Persons with Disabilities",
    "category": "Awareness",
    "description": "UN day.",
    "relevantFor": "Charity, accessibility, employers, retail",
    "notes": "Accessible employment and product stories",
    "provenance": "official"
  },
  {
    "date": "12-10",
    "event": "Human Rights Day",
    "category": "Awareness",
    "description": "UN day.",
    "relevantFor": "Charity, NGOs, B Corps, ethical brands",
    "notes": "Genuine human rights work only",
    "provenance": "official"
  },
  {
    "date": "12-21",
    "event": "Winter Solstice / Shortest Day",
    "category": "Seasonal",
    "description": "Astronomical event.",
    "relevantFor": "Hospitality, wellness, hygge brands, retail",
    "notes": "Cosy season peak content",
    "provenance": "cultural"
  },
  {
    "date": "12-25",
    "event": "Christmas Day",
    "category": "Seasonal/Retail",
    "description": "Major UK cultural moment.",
    "relevantFor": "All consumer brands (lead-in November)",
    "notes": "Gift guides, family content, alternative angles",
    "provenance": "cultural"
  },
  {
    "date": "12-26",
    "event": "Boxing Day",
    "category": "Seasonal/Retail",
    "description": "Major UK retail day.",
    "relevantFor": "Retail, hospitality, sport (football)",
    "notes": "Sales, family content, football fixtures",
    "provenance": "cultural"
  },
  {
    "date": "12-31",
    "event": "New Year's Eve",
    "category": "Seasonal",
    "description": "Major hospitality night.",
    "relevantFor": "Hospitality, food & drink, retail, lifestyle",
    "notes": "Party menus, year-in-review content, predictions",
    "provenance": "cultural"
  },
  {
    "date": "2026-06-11",
    "event": "FIFA World Cup begins (USA/Canada/Mexico)",
    "category": "Sport",
    "description": "Month-long global football tournament, 11 June to 19 July. Massive UK media saturation, late-night kick-offs UK time.",
    "relevantFor": "Hospitality, food & drink, pubs/venues, retail, care (resident watch parties)",
    "notes": "Watch-party menus, late kick-off angles, nostalgia content, multi-generational viewing",
    "duration": 39,
    "provenance": "cultural"
  },
  {
    "date": "2026-07-19",
    "event": "FIFA World Cup Final",
    "category": "Sport",
    "description": "Tournament final. Peak audience moment.",
    "relevantFor": "Hospitality, food & drink, retail, pubs",
    "notes": "Final-day events, reactive content win-or-lose",
    "provenance": "cultural"
  },
  {
    "date": "2026-07-23",
    "event": "Commonwealth Games Glasgow begin",
    "category": "Sport",
    "description": "Glasgow hosts 23 July to 2 August. Scaled-back but high-profile Scottish moment.",
    "relevantFor": "Scottish hospitality, tourism, sport, food & drink",
    "notes": "Scottish tourism angles, Australian visitor influx, athlete stories",
    "duration": 11,
    "provenance": "cultural"
  },
  {
    "date": "04-01",
    "event": "April Fools' Day",
    "category": "Cultural (social-first)",
    "description": "Brand pranks and spoof launches. High risk, high reward; only with genuine wit.",
    "relevantFor": "Retail, hospitality, consumer, any playful brand",
    "notes": "Spoof product launches, deadpan announcements; sharp execution or nothing",
    "provenance": "commercial"
  },
  {
    "date": "02-09",
    "event": "National Pizza Day",
    "category": "Seasonal/Retail (social-first)",
    "description": "US-origin food day with real UK media and social traction.",
    "relevantFor": "Hospitality, food & drink, kitchenware",
    "notes": "Menu specials, pizza-at-home content",
    "provenance": "commercial"
  },
  {
    "date": "02-11",
    "event": "International Day of Women and Girls in Science",
    "category": "Awareness (UN)",
    "description": "UN day promoting women and girls in STEM.",
    "relevantFor": "Tech, education, employers",
    "notes": "Female-founder and STEM-career stories",
    "provenance": "official"
  },
  {
    "date": "02-17",
    "event": "Random Acts of Kindness Day",
    "category": "Awareness (social-first)",
    "description": "Global kindness day with strong social appeal.",
    "relevantFor": "Care, hospitality, charity, employers",
    "notes": "Staff and community kindness initiatives, surprise gestures on camera",
    "provenance": "charity"
  },
  {
    "date": "03-01",
    "event": "Marie Curie Great Daffodil Appeal",
    "category": "Awareness (UK month)",
    "description": "UK fundraising month for end of life care.",
    "relevantFor": "Care, charity, community",
    "notes": "Home displays, fundraising tie-ins",
    "duration": 31,
    "provenance": "charity"
  },
  {
    "date": "03-21",
    "event": "International Day of Forests",
    "category": "Awareness (UN)",
    "description": "UN day on forests and trees.",
    "relevantFor": "Estates, sustainability, outdoor brands",
    "notes": "Estate woodland stories, tree planting",
    "provenance": "official"
  },
  {
    "date": "03-22",
    "event": "World Water Day",
    "category": "Awareness (UN)",
    "description": "UN day on water and sustainability.",
    "relevantFor": "Sustainability, hospitality, food & drink",
    "notes": "Water-saving operations, sustainability commitments",
    "provenance": "official"
  },
  {
    "date": "04-21",
    "event": "World Creativity and Innovation Day",
    "category": "Awareness (UN)",
    "description": "UN day celebrating creativity and problem solving.",
    "relevantFor": "Agencies, tech, brands with innovation stories",
    "notes": "Behind-the-scenes creative process content",
    "provenance": "official"
  },
  {
    "date": "05-01",
    "event": "National Walking Month",
    "category": "Awareness (UK month)",
    "description": "Living Streets' UK month promoting everyday walking.",
    "relevantFor": "Wellness, care, tourism, employers",
    "notes": "Walking challenges, resident strolls, lunchtime walk content",
    "duration": 31,
    "provenance": "charity"
  },
  {
    "date": "05-15",
    "event": "International Day of Families",
    "category": "Awareness (UN)",
    "description": "UN day on family life.",
    "relevantFor": "Care, family brands, hospitality",
    "notes": "Intergenerational stories, family traditions",
    "provenance": "official"
  },
  {
    "date": "05-18",
    "event": "International Museum Day",
    "category": "Awareness",
    "description": "Global museums day, strong UK participation.",
    "relevantFor": "Arts, tourism, education, heritage estates",
    "notes": "Local museum partnerships, heritage stories",
    "provenance": "official"
  },
  {
    "date": "05-20",
    "event": "World Bee Day",
    "category": "Awareness (UN)",
    "description": "UN day on pollinators.",
    "relevantFor": "Sustainability, food, estates and gardens",
    "notes": "Estate hives, pollinator planting, honey menus",
    "provenance": "official"
  },
  {
    "date": "05-21",
    "event": "International Tea Day",
    "category": "Awareness (UN, social-first)",
    "description": "UN day; a gift for UK brands.",
    "relevantFor": "Hospitality, care, kitchenware, retail",
    "notes": "Afternoon tea content, resident tea rituals, brew debates",
    "provenance": "official"
  },
  {
    "date": "06-01",
    "event": "Volunteers' Week",
    "category": "Awareness (UK week)",
    "description": "UK week celebrating volunteers, 1 to 7 June.",
    "relevantFor": "Charity, employers, care, community",
    "notes": "Volunteer profiles, team volunteering days",
    "duration": 7,
    "provenance": "industry"
  },
  {
    "date": "06-03",
    "event": "World Bicycle Day",
    "category": "Awareness (UN)",
    "description": "UN day promoting cycling.",
    "relevantFor": "Sustainability, leisure, green transport",
    "notes": "Cycle-to-work stories, e-bike and active travel angles",
    "provenance": "official"
  },
  {
    "date": "06-08",
    "event": "Carers Week",
    "category": "Awareness (UK week)",
    "description": "UK awareness week for unpaid carers. Floating week, confirm exact dates each year.",
    "relevantFor": "Care, charity, employers, healthcare",
    "notes": "Carer stories, respite support, employer flexibility",
    "duration": 7,
    "provenance": "charity"
  },
  {
    "date": "06-14",
    "event": "World Blood Donor Day",
    "category": "Awareness (WHO)",
    "description": "WHO day thanking blood donors.",
    "relevantFor": "Healthcare, employers, community",
    "notes": "Staff donation drives, donor stories",
    "provenance": "official"
  },
  {
    "date": "06-15",
    "event": "Loneliness Awareness Week",
    "category": "Awareness (UK week)",
    "description": "Marmalade Trust UK week on loneliness. Floating week, confirm exact dates each year.",
    "relevantFor": "Care, charity, community, hospitality",
    "notes": "Befriending schemes, community meals, intergenerational meetups",
    "duration": 7,
    "provenance": "charity"
  },
  {
    "date": "06-20",
    "event": "World Refugee Day",
    "category": "Awareness (UN)",
    "description": "UN day honouring refugees. Handle with substance only.",
    "relevantFor": "Charity, employers with genuine programmes",
    "notes": "Employment and welcome schemes; no token gestures",
    "provenance": "official"
  },
  {
    "date": "06-21",
    "event": "International Day of Yoga",
    "category": "Awareness (UN)",
    "description": "UN day on yoga and wellbeing.",
    "relevantFor": "Wellness, hospitality spas, care",
    "notes": "Chair yoga for residents, garden sessions, spa programming",
    "provenance": "official"
  },
  {
    "date": "06-23",
    "event": "International Women in Engineering Day",
    "category": "Awareness (UK-founded)",
    "description": "UK-founded global day for women in engineering.",
    "relevantFor": "Tech, construction, employers",
    "notes": "Female engineer profiles, apprenticeship pushes",
    "provenance": "official"
  },
  {
    "date": "07-07",
    "event": "World Chocolate Day",
    "category": "Awareness (social-first)",
    "description": "Global chocolate day with easy UK traction.",
    "relevantFor": "Food & drink, hospitality, retail",
    "notes": "Dessert menus, chocolate pairings, taste tests",
    "provenance": "commercial"
  },
  {
    "date": "07-17",
    "event": "World Emoji Day",
    "category": "Awareness (social-first)",
    "description": "Internet-native day, pure social play.",
    "relevantFor": "Consumer, hospitality, any playful brand",
    "notes": "Emoji-only menus, guess-the-emoji games",
    "provenance": "commercial"
  },
  {
    "date": "07-18",
    "event": "Nelson Mandela International Day",
    "category": "Awareness (UN)",
    "description": "UN day encouraging 67 minutes of service.",
    "relevantFor": "Charity, employers, community",
    "notes": "Team volunteering, 67-minute challenges",
    "provenance": "official"
  },
  {
    "date": "07-24",
    "event": "International Self-Care Day",
    "category": "Awareness",
    "description": "Global self-care day.",
    "relevantFor": "Wellness, care, beauty, hospitality spas",
    "notes": "Self-care routines, carer self-care angle, spa content",
    "provenance": "charity"
  },
  {
    "date": "08-08",
    "event": "International Cat Day",
    "category": "Awareness (social-first)",
    "description": "Global cat day, reliable social gold.",
    "relevantFor": "Pet brands, consumer, care (therapy animals)",
    "notes": "Office and resident cats, playful content",
    "provenance": "commercial"
  },
  {
    "date": "08-13",
    "event": "International Left-Handers Day",
    "category": "Awareness (social-first)",
    "description": "Celebrates left-handed life and its daily frustrations.",
    "relevantFor": "Kitchenware, consumer, retail",
    "notes": "Left-handed gadget content, design empathy stories",
    "provenance": "commercial"
  },
  {
    "date": "08-26",
    "event": "International Dog Day",
    "category": "Awareness (social-first)",
    "description": "Global dog day, strong UK social traction.",
    "relevantFor": "Pet-friendly hospitality, care (therapy dogs), consumer",
    "notes": "Therapy dog features, dog-friendly stays, staff dogs",
    "provenance": "commercial"
  },
  {
    "date": "09-01",
    "event": "World Alzheimer's Month",
    "category": "Awareness (month)",
    "description": "Global month on dementia awareness, anchored by World Alzheimer's Day on the 21st.",
    "relevantFor": "Care, healthcare, charity",
    "notes": "Dementia expertise, resident stories, myth-busting; plan a month arc not a single post",
    "duration": 30,
    "provenance": "charity"
  },
  {
    "date": "09-01",
    "event": "Organic September",
    "category": "Awareness (UK month)",
    "description": "Soil Association's UK organic month.",
    "relevantFor": "Food & drink, hospitality, retail, estates",
    "notes": "Organic menus, supplier stories, kitchen garden content",
    "duration": 30,
    "provenance": "industry"
  },
  {
    "date": "09-05",
    "event": "International Day of Charity",
    "category": "Awareness (UN)",
    "description": "UN day promoting charitable giving.",
    "relevantFor": "Charity, employers, brands with CSR",
    "notes": "Partnership stories, giving campaigns",
    "provenance": "official"
  },
  {
    "date": "09-13",
    "event": "Roald Dahl Story Day",
    "category": "Cultural (UK)",
    "description": "UK day celebrating Dahl and storytelling.",
    "relevantFor": "Family brands, education, care (intergenerational)",
    "notes": "Story swaps between residents and children, themed events",
    "provenance": "cultural"
  },
  {
    "date": "3:sat:09",
    "event": "World Cleanup Day",
    "category": "Awareness",
    "description": "Global community cleanup day. Floating, usually third Saturday of September.",
    "relevantFor": "Sustainability, community, employers",
    "notes": "Beach and street cleanups, before-and-after content",
    "provenance": "charity"
  },
  {
    "date": "09-21",
    "event": "World Alzheimer's Day",
    "category": "Awareness",
    "description": "The anchor day of World Alzheimer's Month.",
    "relevantFor": "Care, healthcare, charity",
    "notes": "Expert comment, resident-led stories, practical guidance for families",
    "provenance": "charity"
  },
  {
    "date": "09-22",
    "event": "Recycle Week",
    "category": "Awareness (UK week)",
    "description": "WRAP's UK recycling week. Floating week, confirm exact dates each year.",
    "relevantFor": "Sustainability, retail, hospitality",
    "notes": "Operational recycling stories, packaging commitments",
    "duration": 7,
    "provenance": "industry"
  },
  {
    "date": "09-29",
    "event": "World Heart Day",
    "category": "Awareness",
    "description": "Global cardiovascular health day.",
    "relevantFor": "Healthcare, food brands, fitness, employers",
    "notes": "Heart-healthy menus, exercise programmes, screening pushes",
    "provenance": "official"
  },
  {
    "date": "10-01",
    "event": "International Coffee Day",
    "category": "Awareness (social-first)",
    "description": "Global coffee day with easy activation potential.",
    "relevantFor": "Hospitality, food & drink, EV charging (coffee-while-charging), retail",
    "notes": "Free coffee mechanics, barista content, coffee-and-charge offers",
    "provenance": "industry"
  },
  {
    "date": "10-01",
    "event": "Breast Cancer Awareness Month",
    "category": "Awareness (month)",
    "description": "Global month, major UK charity presence.",
    "relevantFor": "Healthcare, charity, employers, retail",
    "notes": "Substantive fundraising and screening support only; no pinkwashing",
    "duration": 31,
    "provenance": "charity"
  },
  {
    "date": "10-11",
    "event": "International Day of the Girl",
    "category": "Awareness (UN)",
    "description": "UN day on girls' rights and opportunity.",
    "relevantFor": "Charity, education, employers",
    "notes": "Mentoring schemes, education partnerships",
    "provenance": "official"
  },
  {
    "date": "10-21",
    "event": "Apple Day",
    "category": "Cultural (UK)",
    "description": "UK day celebrating apples and orchards, founded by Common Ground.",
    "relevantFor": "Food & drink, estates, hospitality, retail",
    "notes": "Orchard stories, apple menus, pressing days",
    "provenance": "cultural"
  },
  {
    "date": "11-01",
    "event": "Movember",
    "category": "Awareness (month)",
    "description": "Men's health month covering mental health, suicide prevention and cancers.",
    "relevantFor": "Men's health, care, employers, hospitality",
    "notes": "Moustache campaigns with substance, men's health conversations",
    "duration": 30,
    "provenance": "charity"
  },
  {
    "date": "11-25",
    "event": "White Ribbon Day",
    "category": "Awareness (UK)",
    "description": "UK day against male violence against women; UN International Day for the Elimination of Violence against Women.",
    "relevantFor": "Charity, employers, education",
    "notes": "Ally pledges, workplace policy stories; serious tone only",
    "provenance": "official"
  },
  {
    "date": "11-25",
    "event": "16 Days of Activism",
    "category": "Awareness (UN, runs to 10 Dec)",
    "description": "UN campaign against gender-based violence, 25 Nov to 10 Dec.",
    "relevantFor": "Charity, employers, education",
    "notes": "Sustained campaign arc rather than one-day gesture",
    "duration": 16,
    "provenance": "official"
  },
  {
    "date": "12-05",
    "event": "International Volunteer Day",
    "category": "Awareness (UN)",
    "description": "UN day celebrating volunteering.",
    "relevantFor": "Charity, employers, community",
    "notes": "Volunteer profiles, end-of-year thank-yous",
    "provenance": "official"
  },
  {
    "date": "01-01",
    "event": "Veganuary",
    "category": "Awareness (UK month)",
    "description": "UK-founded month of trying vegan.",
    "relevantFor": "Food & drink, hospitality, retail",
    "notes": "Vegan menus, chef challenges, taste tests",
    "duration": 31,
    "provenance": "charity"
  },
  {
    "date": "01-01",
    "event": "Dry January",
    "category": "Awareness (UK month)",
    "description": "Alcohol Change UK's alcohol-free month.",
    "relevantFor": "Hospitality, food & drink, wellness",
    "notes": "No and low menus, mocktail content",
    "duration": 31,
    "provenance": "charity"
  },
  {
    "date": "01-05",
    "event": "Twelfth Night",
    "category": "Cultural",
    "description": "Traditional end of Christmas festivities.",
    "relevantFor": "Hospitality, heritage",
    "notes": "Decorations-down content, wassailing heritage",
    "provenance": "cultural"
  },
  {
    "date": "01-18",
    "event": "Winnie the Pooh Day",
    "category": "Cultural (social-first)",
    "description": "A. A. Milne's birthday.",
    "relevantFor": "Family brands, care (intergenerational), hospitality",
    "notes": "Storytime content, honey-themed treats",
    "provenance": "commercial"
  },
  {
    "date": "01-21",
    "event": "National Hug Day",
    "category": "Awareness (social-first)",
    "description": "US-origin with UK social traction.",
    "relevantFor": "Care, charity, community",
    "notes": "Warm human content; consent-aware framing",
    "provenance": "commercial"
  },
  {
    "date": "01-21",
    "event": "Squirrel Appreciation Day",
    "category": "Awareness (social-first)",
    "description": "Quirky wildlife day with reliable social charm.",
    "relevantFor": "Estates, gardens, outdoor brands",
    "notes": "Grounds wildlife content",
    "provenance": "commercial"
  },
  {
    "date": "01-24",
    "event": "International Day of Education",
    "category": "Awareness (UN)",
    "description": "UN day on education.",
    "relevantFor": "Education, charity, employers",
    "notes": "Apprenticeship and training stories",
    "provenance": "official"
  },
  {
    "date": "01-26",
    "event": "Australia Day",
    "category": "Cultural",
    "description": "Australian national day.",
    "relevantFor": "Tourism, hospitality targeting Australian visitors",
    "notes": "Aussie visitor angles, antipodean menus",
    "provenance": "cultural"
  },
  {
    "date": "01-28",
    "event": "Data Protection Day",
    "category": "Awareness",
    "description": "European data privacy day.",
    "relevantFor": "Tech, B2B",
    "notes": "Practical privacy guidance",
    "provenance": "official"
  },
  {
    "date": "last:fri:01",
    "event": "RSPB Big Garden Birdwatch",
    "category": "Awareness (UK weekend)",
    "description": "The world's largest garden wildlife survey, last weekend of January.",
    "relevantFor": "Estates, care (resident activity), gardens, community",
    "notes": "Resident birdwatching, grounds counts, family activity",
    "duration": 3,
    "provenance": "charity"
  },
  {
    "date": "02-02",
    "event": "World Wetlands Day",
    "category": "Awareness (UN)",
    "description": "Day on wetlands and nature.",
    "relevantFor": "Estates, sustainability",
    "notes": "Pond and habitat stories",
    "provenance": "official"
  },
  {
    "date": "2:tue:02",
    "event": "Safer Internet Day",
    "category": "Awareness",
    "description": "Global online safety day, big in UK schools.",
    "relevantFor": "Tech, education, family brands, employers",
    "notes": "Practical online safety guidance",
    "provenance": "official"
  },
  {
    "date": "02-09",
    "event": "National Apprenticeship Week",
    "category": "Awareness (UK week)",
    "description": "UK week celebrating apprenticeships. Floating week, confirm exact dates each year.",
    "relevantFor": "Employers, hospitality, care, construction",
    "notes": "Apprentice profiles, earn-while-you-learn stories",
    "duration": 5,
    "provenance": "official"
  },
  {
    "date": "02-13",
    "event": "World Radio Day",
    "category": "Awareness (UN)",
    "description": "UNESCO day celebrating radio.",
    "relevantFor": "Media, community, charity",
    "notes": "Local radio partnership moments",
    "provenance": "official"
  },
  {
    "date": "02-17",
    "event": "Shrove Tuesday (Pancake Day)",
    "category": "Cultural (social-first)",
    "description": "Major UK food day. Moves with Easter, confirm the date each year.",
    "relevantFor": "Hospitality, food & drink, kitchenware, care",
    "notes": "Pancake races, flip challenges, topping debates; Zyliss territory",
    "provenance": "commercial"
  },
  {
    "date": "02-20",
    "event": "World Day of Social Justice",
    "category": "Awareness (UN)",
    "description": "UN day on fair societies.",
    "relevantFor": "Charity, B Corps, ethical employers",
    "notes": "Substantive fairness and pay stories",
    "provenance": "official"
  },
  {
    "date": "02-23",
    "event": "Fairtrade Fortnight",
    "category": "Awareness (UK fortnight)",
    "description": "Fairtrade Foundation's UK campaign. Floating, confirm exact dates each year.",
    "relevantFor": "Food & drink, hospitality, retail",
    "notes": "Supplier stories, fairtrade menus",
    "duration": 14,
    "provenance": "industry"
  },
  {
    "date": "02-28",
    "event": "Rare Disease Day",
    "category": "Awareness",
    "description": "Held on the last day of February.",
    "relevantFor": "Healthcare, charity",
    "notes": "Patient and family stories with care",
    "provenance": "charity"
  },
  {
    "date": "03-01",
    "event": "Zero Discrimination Day",
    "category": "Awareness (UN)",
    "description": "UN day against discrimination.",
    "relevantFor": "Employers, charity, D&I",
    "notes": "Genuine inclusion stories only",
    "provenance": "official"
  },
  {
    "date": "03-13",
    "event": "World Sleep Day",
    "category": "Awareness",
    "description": "Global sleep health day. Floating, the Friday before the spring equinox.",
    "relevantFor": "Wellness, hospitality, care, bedding and interiors",
    "notes": "Sleep tips, best-night's-sleep content, resident routines",
    "provenance": "industry"
  },
  {
    "date": "03-14",
    "event": "Pi Day",
    "category": "Cultural (social-first)",
    "description": "Maths day with playful food crossover.",
    "relevantFor": "Food & drink, education, tech",
    "notes": "Pie content, 3.14 offers",
    "provenance": "commercial"
  },
  {
    "date": "03-16",
    "event": "Nutrition & Hydration Week",
    "category": "Awareness (UK week)",
    "description": "Care-sector week on good nutrition and hydration. Floating week, confirm dates each year.",
    "relevantFor": "Care, healthcare, catering",
    "notes": "Memory menus, hydration stations, chef-led stories; care roster gold",
    "duration": 7,
    "provenance": "industry"
  },
  {
    "date": "03-18",
    "event": "Global Recycling Day",
    "category": "Awareness",
    "description": "Day on recycling as a resource.",
    "relevantFor": "Sustainability, retail, hospitality",
    "notes": "Operational recycling and reuse stories",
    "provenance": "official"
  },
  {
    "date": "03-20",
    "event": "English Tourism Week",
    "category": "Awareness (UK week)",
    "description": "VisitEngland's week celebrating English tourism. Floating week, confirm dates each year.",
    "relevantFor": "Hospitality, tourism, attractions",
    "notes": "Local tourism economy stories, behind-the-scenes content",
    "duration": 9,
    "provenance": "industry"
  },
  {
    "date": "03-21",
    "event": "World Poetry Day",
    "category": "Awareness (UNESCO)",
    "description": "UNESCO day celebrating poetry.",
    "relevantFor": "Arts, education, care (reminiscence)",
    "notes": "Resident poetry, verse-led social content",
    "provenance": "official"
  },
  {
    "date": "03-27",
    "event": "World Theatre Day",
    "category": "Awareness",
    "description": "International theatre day.",
    "relevantFor": "Arts, hospitality, education",
    "notes": "Local theatre partnerships",
    "provenance": "official"
  },
  {
    "date": "03-31",
    "event": "Transgender Day of Visibility",
    "category": "Awareness",
    "description": "Day celebrating transgender people. Substance only.",
    "relevantFor": "Employers with genuine D&I, charity",
    "notes": "Authentic visibility stories; no token gestures",
    "provenance": "charity"
  },
  {
    "date": "last:sat:03",
    "event": "Earth Hour",
    "category": "Awareness (global moment)",
    "description": "WWF's lights-off hour, last Saturday of March evening.",
    "relevantFor": "Sustainability, hospitality, estates",
    "notes": "Candlelit dinners, lights-off moments",
    "provenance": "charity"
  },
  {
    "date": "04-01",
    "event": "Stress Awareness Month",
    "category": "Awareness (month)",
    "description": "UK month on stress and its management.",
    "relevantFor": "Wellness, employers, care, HR",
    "notes": "Workplace wellbeing with substance",
    "duration": 30,
    "provenance": "industry"
  },
  {
    "date": "04-10",
    "event": "National Siblings Day",
    "category": "Awareness (social-first)",
    "description": "US-origin with UK social traction.",
    "relevantFor": "Family brands, care, hospitality",
    "notes": "Sibling stories, resident family content",
    "provenance": "commercial"
  },
  {
    "date": "04-11",
    "event": "National Pet Day",
    "category": "Awareness (social-first)",
    "description": "US-origin pet day with UK traction.",
    "relevantFor": "Pet-friendly hospitality, care (therapy animals)",
    "notes": "Office and resident pets",
    "provenance": "commercial"
  },
  {
    "date": "04-27",
    "event": "National Gardening Week",
    "category": "Awareness (UK week)",
    "description": "RHS-backed UK gardening week. Floating week, confirm dates each year.",
    "relevantFor": "Estates, care, gardens, community",
    "notes": "Intergenerational planting, kitchen gardens",
    "duration": 7,
    "provenance": "industry"
  },
  {
    "date": "04-28",
    "event": "World Day for Safety and Health at Work",
    "category": "Awareness (UN)",
    "description": "ILO day on safe workplaces.",
    "relevantFor": "Employers, construction, care",
    "notes": "Practical safety culture stories",
    "provenance": "official"
  },
  {
    "date": "04-29",
    "event": "International Dance Day",
    "category": "Awareness",
    "description": "Global dance day.",
    "relevantFor": "Arts, care (movement), wellness, hospitality",
    "notes": "Dancing with residents, tea dances",
    "provenance": "official"
  },
  {
    "date": "04-30",
    "event": "International Jazz Day",
    "category": "Awareness (UNESCO)",
    "description": "UNESCO day celebrating jazz.",
    "relevantFor": "Music, festivals, hospitality",
    "notes": "Jazz events and lineup content; festival clients",
    "provenance": "official"
  },
  {
    "date": "05-03",
    "event": "World Press Freedom Day",
    "category": "Awareness (UN)",
    "description": "UN day on press freedom.",
    "relevantFor": "Media, charity, B2B",
    "notes": "Considered commentary only",
    "provenance": "official"
  },
  {
    "date": "05-04",
    "event": "Deaf Awareness Week",
    "category": "Awareness (UK week)",
    "description": "UK week on deaf awareness. Floating week, confirm dates each year.",
    "relevantFor": "Care, healthcare, employers, accessibility",
    "notes": "Accessible service stories, staff training",
    "duration": 7,
    "provenance": "industry"
  },
  {
    "date": "05-08",
    "event": "VE Day",
    "category": "Cultural (UK)",
    "description": "Anniversary of Victory in Europe, 1945.",
    "relevantFor": "Care (resident memories), heritage, community",
    "notes": "Resident wartime memories handled with dignity, street party nostalgia",
    "provenance": "official"
  },
  {
    "date": "05-09",
    "event": "National Doughnut Week",
    "category": "Awareness (UK week)",
    "description": "UK charity baking week. Floating week, confirm dates each year.",
    "relevantFor": "Food & drink, hospitality, community",
    "notes": "Charity bakes, doughnut content",
    "duration": 7,
    "provenance": "charity"
  },
  {
    "date": "05-11",
    "event": "Dementia Action Week",
    "category": "Awareness (UK week)",
    "description": "Alzheimer's Society's flagship UK week. Floating week, confirm dates each year.",
    "relevantFor": "Care, healthcare, charity",
    "notes": "The care roster's biggest week after Alzheimer's Month; expert-led and resident-led stories",
    "duration": 7,
    "provenance": "charity"
  },
  {
    "date": "05-11",
    "event": "British Sandwich Week",
    "category": "Awareness (UK week)",
    "description": "UK week celebrating the sandwich. Floating week, confirm dates each year.",
    "relevantFor": "Food & drink, hospitality, kitchenware",
    "notes": "Signature sandwich content, chef takes",
    "duration": 7,
    "provenance": "industry"
  },
  {
    "date": "05-12",
    "event": "International Nurses Day",
    "category": "Awareness",
    "description": "Florence Nightingale's birthday, global nursing day.",
    "relevantFor": "Care, healthcare, charity",
    "notes": "Nurse profiles and thank-yous; care roster gold",
    "provenance": "official"
  },
  {
    "date": "05-17",
    "event": "IDAHOBIT",
    "category": "Awareness",
    "description": "International Day Against Homophobia, Biphobia and Transphobia.",
    "relevantFor": "Employers with genuine D&I, charity",
    "notes": "Substantive inclusion stories",
    "provenance": "charity"
  },
  {
    "date": "05-18",
    "event": "National Vegetarian Week",
    "category": "Awareness (UK week)",
    "description": "UK veggie week. Floating week, confirm dates each year.",
    "relevantFor": "Food & drink, hospitality, retail",
    "notes": "Veggie menus, chef challenges",
    "duration": 7,
    "provenance": "industry"
  },
  {
    "date": "06-13",
    "event": "National Picnic Week",
    "category": "Awareness (UK week)",
    "description": "UK picnic season opener. Floating week, confirm dates each year.",
    "relevantFor": "Hospitality, food & drink, estates, retail",
    "notes": "Picnic hampers, grounds picnics, family content",
    "duration": 9,
    "provenance": "industry"
  },
  {
    "date": "06-18",
    "event": "International Sushi Day",
    "category": "Awareness (social-first)",
    "description": "Global food day with social traction.",
    "relevantFor": "Food & drink, hospitality",
    "notes": "Menu content, making-of reels",
    "provenance": "commercial"
  },
  {
    "date": "06-20",
    "event": "English Wine Week",
    "category": "Awareness (UK week)",
    "description": "Celebration of English wine. Floating week, confirm dates each year.",
    "relevantFor": "Hospitality, food & drink, estates",
    "notes": "English wine lists, vineyard pairings",
    "duration": 9,
    "provenance": "industry"
  },
  {
    "date": "06-21",
    "event": "World Music Day",
    "category": "Cultural",
    "description": "Fête de la Musique, global day of free music.",
    "relevantFor": "Music, festivals, hospitality, care (music therapy)",
    "notes": "Live music moments, resident singalongs; festival clients",
    "provenance": "cultural"
  },
  {
    "date": "06-22",
    "event": "Care Home Open Week",
    "category": "Awareness (UK week)",
    "description": "UK week when care homes open their doors to communities. Floating week, confirm dates each year.",
    "relevantFor": "Care",
    "notes": "The sector's open-door moment: community events, tours, intergenerational visits",
    "duration": 7,
    "provenance": "industry"
  },
  {
    "date": "07-01",
    "event": "Plastic Free July",
    "category": "Awareness (month)",
    "description": "Global month on cutting single-use plastic.",
    "relevantFor": "Sustainability, hospitality, retail",
    "notes": "Operational plastic-cutting stories with numbers",
    "duration": 31,
    "provenance": "industry"
  },
  {
    "date": "07-14",
    "event": "Bastille Day",
    "category": "Cultural",
    "description": "French national day.",
    "relevantFor": "Hospitality, food & drink",
    "notes": "French menus, wine pairings",
    "provenance": "cultural"
  },
  {
    "date": "08-09",
    "event": "Book Lovers Day",
    "category": "Awareness (social-first)",
    "description": "Reading celebration with social traction.",
    "relevantFor": "Publishing, education, care, hospitality",
    "notes": "Reading nooks, resident book clubs, staff picks",
    "provenance": "commercial"
  },
  {
    "date": "08-10",
    "event": "Afternoon Tea Week",
    "category": "Awareness (UK week)",
    "description": "UK celebration of afternoon tea. Floating week, confirm dates each year.",
    "relevantFor": "Hospitality, food & drink, care",
    "notes": "Signature teas, tiered-stand content; hospitality roster gold",
    "duration": 7,
    "provenance": "industry"
  },
  {
    "date": "08-27",
    "event": "National Burger Day (UK)",
    "category": "Awareness (UK, social-first)",
    "description": "UK burger day, late August. Floating, confirm date each year.",
    "relevantFor": "Food & drink, hospitality",
    "notes": "Burger builds, chef specials",
    "provenance": "commercial"
  },
  {
    "date": "09-01",
    "event": "Professional Care Workers' Week",
    "category": "Awareness (UK week)",
    "description": "UK week celebrating care workers. Floating week, confirm dates each year.",
    "relevantFor": "Care",
    "notes": "Carer profiles, thank-you campaigns; care roster gold",
    "duration": 5,
    "provenance": "industry"
  },
  {
    "date": "09-19",
    "event": "International Talk Like a Pirate Day",
    "category": "Cultural (social-first)",
    "description": "Pure social silliness with decent UK traction.",
    "relevantFor": "Family brands, hospitality, retail",
    "notes": "Playful content only where tone allows",
    "provenance": "commercial"
  },
  {
    "date": "09-19",
    "event": "British Food Fortnight",
    "category": "Awareness (UK fortnight)",
    "description": "UK celebration of British food. Floating, confirm dates each year.",
    "relevantFor": "Food & drink, hospitality, estates",
    "notes": "British produce menus, supplier stories",
    "duration": 16,
    "provenance": "industry"
  },
  {
    "date": "09-22",
    "event": "World Car Free Day",
    "category": "Awareness",
    "description": "Global day reimagining streets without cars.",
    "relevantFor": "Sustainability, EV and transport, community",
    "notes": "Active travel and charging-network angles",
    "provenance": "official"
  },
  {
    "date": "09-23",
    "event": "National Fitness Day",
    "category": "Awareness (UK)",
    "description": "UK day promoting activity. Floating, confirm date each year.",
    "relevantFor": "Fitness, wellness, care (mobility), employers",
    "notes": "Chair workouts, team challenges",
    "provenance": "industry"
  },
  {
    "date": "09-24",
    "event": "National Day of Arts in Care Homes",
    "category": "Awareness (UK)",
    "description": "UK day celebrating creativity in care settings.",
    "relevantFor": "Care, arts",
    "notes": "Resident art shows, creative sessions; care roster gold",
    "provenance": "industry"
  },
  {
    "date": "09-24",
    "event": "Cask Ale Week",
    "category": "Awareness (UK)",
    "description": "UK celebration of cask beer. Floating, confirm dates each year.",
    "relevantFor": "Pubs, hospitality, food & drink",
    "notes": "Cellar stories, tasting events",
    "duration": 10,
    "provenance": "industry"
  },
  {
    "date": "09-27",
    "event": "World Tourism Day",
    "category": "Awareness (UN)",
    "description": "UN day on tourism.",
    "relevantFor": "Hospitality, tourism, attractions",
    "notes": "Tourism economy stories, behind-the-scenes",
    "provenance": "official"
  },
  {
    "date": "10-01",
    "event": "Sober October",
    "category": "Awareness (month)",
    "description": "Macmillan's alcohol-free fundraising month.",
    "relevantFor": "Hospitality, wellness, food & drink",
    "notes": "No and low menus, fundraising tie-ins",
    "duration": 31,
    "provenance": "charity"
  },
  {
    "date": "1:sun:10",
    "event": "Silver Sunday",
    "category": "Awareness (UK)",
    "description": "UK day celebrating older people, first Sunday of October.",
    "relevantFor": "Care, community, charity",
    "notes": "Community events for older people; care roster gold",
    "provenance": "charity"
  },
  {
    "date": "1:sun:10",
    "event": "Grandparents Day (UK)",
    "category": "Awareness (UK)",
    "description": "UK Grandparents Day, first Sunday of October.",
    "relevantFor": "Care, family brands, hospitality",
    "notes": "Intergenerational content, grandkids visits",
    "provenance": "charity"
  },
  {
    "date": "1:fri:10",
    "event": "World Smile Day",
    "category": "Awareness (social-first)",
    "description": "First Friday of October, acts of kindness and smiles.",
    "relevantFor": "Any warm brand, care, hospitality",
    "notes": "Feel-good social content",
    "provenance": "commercial"
  },
  {
    "date": "10-05",
    "event": "World Teachers' Day",
    "category": "Awareness (UNESCO)",
    "description": "UNESCO day celebrating teachers.",
    "relevantFor": "Education, charity, employers",
    "notes": "Teacher thank-yous, education partnerships",
    "provenance": "official"
  },
  {
    "date": "10-05",
    "event": "National Curry Week",
    "category": "Awareness (UK week)",
    "description": "UK celebration of curry. Floating week, confirm dates each year.",
    "relevantFor": "Food & drink, hospitality",
    "notes": "Curry menus, chef collaborations",
    "duration": 7,
    "provenance": "industry"
  },
  {
    "date": "10-12",
    "event": "National Baking Week",
    "category": "Awareness (UK week)",
    "description": "UK baking celebration. Floating week, confirm dates each year.",
    "relevantFor": "Food & drink, kitchenware, care (baking activities)",
    "notes": "Bake-alongs, resident bakes; kitchenware gold",
    "duration": 7,
    "provenance": "industry"
  },
  {
    "date": "10-18",
    "event": "World Menopause Day",
    "category": "Awareness",
    "description": "Global day on menopause awareness.",
    "relevantFor": "Employers, healthcare, wellness",
    "notes": "Workplace policy and support stories with substance",
    "provenance": "official"
  },
  {
    "date": "11-01",
    "event": "World Vegan Day",
    "category": "Awareness",
    "description": "Global vegan day opening World Vegan Month.",
    "relevantFor": "Food & drink, hospitality, retail",
    "notes": "Vegan menus and product content",
    "provenance": "official"
  },
  {
    "date": "11-16",
    "event": "Anti-Bullying Week",
    "category": "Awareness (UK week)",
    "description": "UK schools-led week. Floating week, confirm dates each year.",
    "relevantFor": "Education, employers, charity",
    "notes": "Workplace respect and school partnership stories",
    "duration": 5,
    "provenance": "charity"
  },
  {
    "date": "11-20",
    "event": "World Children's Day",
    "category": "Awareness (UN)",
    "description": "UN day on children's rights.",
    "relevantFor": "Children's charities, education, family brands",
    "notes": "Children's voice stories; WellChild territory",
    "provenance": "official"
  },
  {
    "date": "4:thu:11",
    "event": "Carers Rights Day",
    "category": "Awareness (UK)",
    "description": "Carers UK day on unpaid carers' rights, late November.",
    "relevantFor": "Care, charity, employers",
    "notes": "Carer rights guidance, employer flexibility stories",
    "provenance": "charity"
  },
  {
    "date": "2:fri:12",
    "event": "Christmas Jumper Day",
    "category": "Awareness (UK, social-first)",
    "description": "Save the Children's UK fundraiser, second Friday of December.",
    "relevantFor": "Any brand, employers, care, hospitality",
    "notes": "Team jumpers, resident knits, fundraising content; UK social gold",
    "provenance": "charity"
  }
];

export const SEED_CLIENTS = [
  {
    "name": "Autumna",
    "industry": "Care transparency platform — UK",
    "location": "UK",
    "website": "",
    "description": "Care home comparison and transparency platform including OpenScore ratings.",
    "topics": "care home ratings, comparison, CQC data, transparency, choosing a care home, care fees",
    "tone": "Bold, honest, data-led challenger",
    "avoid": "",
    "budget": "",
    "briefing": "",
    "prospect": false,
    "active": true
  },
  {
    "name": "Church Farm Care",
    "industry": "Care homes — Nottinghamshire",
    "location": "Nottinghamshire",
    "website": "",
    "description": "Care home provider offering residential and nursing care.",
    "topics": "care home quality, CQC ratings, elderly care, dementia care, person-centred care, Nottinghamshire",
    "tone": "Warm, person-centred, story-led",
    "avoid": "",
    "budget": "",
    "briefing": "",
    "prospect": false,
    "active": true
  },
  {
    "name": "Cinnamon Care",
    "industry": "Premium care homes — UK",
    "location": "UK",
    "website": "",
    "description": "Care home group providing premium residential, nursing and dementia care across the UK.",
    "topics": "premium care, elderly care, dementia care, CQC ratings, care home design, luxury care",
    "tone": "",
    "avoid": "",
    "budget": "",
    "briefing": "",
    "prospect": false,
    "active": true
  },
  {
    "name": "Clearstone Care",
    "industry": "Care home group — UK",
    "location": "UK",
    "website": "",
    "description": "Care home group providing residential and nursing care.",
    "topics": "care home quality, CQC, elderly care, dementia care, staffing, social care policy",
    "tone": "",
    "avoid": "",
    "budget": "",
    "briefing": "",
    "prospect": false,
    "active": true
  },
  {
    "name": "CoolCare",
    "industry": "Care management software — UK",
    "location": "UK",
    "website": "",
    "description": "Occupancy and business management software for care homes.",
    "topics": "care home occupancy, management, business data, care technology, profitability, bed occupancy",
    "tone": "",
    "avoid": "",
    "budget": "",
    "briefing": "",
    "prospect": false,
    "active": true
  },
  {
    "name": "Coxbench Hall",
    "industry": "Care home — Derbyshire",
    "location": "Derbyshire",
    "website": "",
    "description": "Care home providing residential care in a historic setting.",
    "topics": "care home quality, residential care, elderly care, CQC, heritage buildings, Derbyshire",
    "tone": "Playful, heritage-proud, personality-led",
    "avoid": "",
    "budget": "",
    "briefing": "",
    "prospect": false,
    "active": true
  },
  {
    "name": "DK Household Brands — Cole & Mason",
    "industry": "Consumer kitchenware — UK",
    "location": "UK",
    "website": "",
    "description": "Premium salt and pepper mills and seasoning brand.",
    "topics": "cooking, seasoning, kitchen accessories, food trends, home dining, entertaining",
    "tone": "",
    "avoid": "",
    "budget": "",
    "briefing": "",
    "prospect": false,
    "active": true
  },
  {
    "name": "DK Household Brands — Zyliss",
    "industry": "Consumer kitchenware — UK",
    "location": "UK",
    "website": "",
    "description": "Kitchen gadgets and cookware brand.",
    "topics": "kitchen trends, cooking, food preparation, kitchenware, home cooking, gadgets",
    "tone": "",
    "avoid": "",
    "budget": "",
    "briefing": "",
    "prospect": false,
    "active": true
  },
  {
    "name": "everyLIFE",
    "industry": "Digital care planning — UK",
    "location": "UK",
    "website": "",
    "description": "Digital care planning and records platform for care providers.",
    "topics": "digital care records, care planning technology, CQC compliance, paperless care, digital transformation",
    "tone": "Self-aware, modern, confident humour",
    "avoid": "",
    "budget": "",
    "briefing": "",
    "prospect": false,
    "active": true
  },
  {
    "name": "Headlam Hall + Rose & Crown",
    "industry": "Hospitality — County Durham",
    "location": "County Durham",
    "website": "",
    "description": "Country house hotel and spa with associated gastropub in the North East.",
    "topics": "North East tourism, country house hotels, spa breaks, gastropubs, rural hospitality, North East food",
    "tone": "",
    "avoid": "",
    "budget": "",
    "briefing": "",
    "prospect": false,
    "active": true
  },
  {
    "name": "Horwood House",
    "industry": "Hospitality — Buckinghamshire",
    "location": "Buckinghamshire",
    "website": "",
    "description": "Country house hotel, spa and events venue.",
    "topics": "country house hotels, wedding venues, spa breaks, corporate events, rural retreats",
    "tone": "Playful, family-friendly country house",
    "avoid": "",
    "budget": "",
    "briefing": "",
    "prospect": false,
    "active": true
  },
  {
    "name": "HOSPA & HMA",
    "industry": "Hospitality association — UK",
    "location": "UK",
    "website": "",
    "description": "Hospitality professionals association covering finance, revenue management and IT.",
    "topics": "hotel revenue management, hospitality finance, hotel technology, hospitality KPIs, benchmarking, industry data",
    "tone": "Progressive industry voice – energetic, champions young talent",
    "avoid": "",
    "budget": "",
    "briefing": "",
    "prospect": false,
    "active": true
  },
  {
    "name": "Kensington Hideaway",
    "industry": "Boutique hospitality — London",
    "location": "London",
    "website": "",
    "description": "Boutique luxury accommodation in Kensington, London.",
    "topics": "London tourism, luxury travel, boutique hotels, staycations, Kensington, luxury short stays",
    "tone": "Stylish, sociable boutique charm",
    "avoid": "",
    "budget": "",
    "briefing": "",
    "prospect": false,
    "active": true
  },
  {
    "name": "Macc Care Group",
    "industry": "Care homes — Cheshire",
    "location": "Macclesfield, Cheshire",
    "website": "",
    "description": "Care home group providing residential and nursing care in Cheshire.",
    "topics": "care home regulation, CQC, elderly care, staffing, dementia care, care funding, nurse recruitment",
    "tone": "Warm and expert, dementia specialism front and centre, community-minded",
    "avoid": "Residents as the butt of the joke; politicising care funding",
    "budget": "",
    "briefing": "",
    "prospect": false,
    "active": true
  },
  {
    "name": "Midhurst Jazz Food & Blues Festival",
    "industry": "Events — West Sussex",
    "location": "Midhurst, West Sussex",
    "website": "",
    "description": "Annual jazz, food and blues festival.",
    "topics": "music festivals, food festivals, live music, West Sussex events, festival season",
    "tone": "",
    "avoid": "",
    "budget": "",
    "briefing": "",
    "prospect": false,
    "active": true
  },
  {
    "name": "Milford Care",
    "industry": "Care homes — UK",
    "location": "UK",
    "website": "",
    "description": "Care home operator providing residential and nursing care.",
    "topics": "care home standards, elderly care, nursing care, social care policy, resident wellbeing",
    "tone": "Homely, personal, intergenerational warmth",
    "avoid": "",
    "budget": "",
    "briefing": "",
    "prospect": false,
    "active": true
  },
  {
    "name": "Murrayshall",
    "industry": "Hospitality & golf — Perthshire",
    "location": "Perthshire, Scotland",
    "website": "",
    "description": "Country house hotel and golf estate in Scotland.",
    "topics": "Scottish tourism, golf tourism, luxury hotels Scotland, country house hotels, weddings, Perthshire",
    "tone": "Proudly Scottish, premium but welcoming",
    "avoid": "",
    "budget": "",
    "briefing": "",
    "prospect": false,
    "active": true
  },
  {
    "name": "Nellsar",
    "industry": "Care home group — South East",
    "location": "South East England",
    "website": "",
    "description": "Care home group operating residential and nursing homes across the South East.",
    "topics": "care home activities, elderly care, dementia care, CQC, intergenerational care, community",
    "tone": "Warm, community-led, activity-rich",
    "avoid": "",
    "budget": "",
    "briefing": "",
    "prospect": false,
    "active": true
  },
  {
    "name": "Net Affinity",
    "industry": "Hospitality technology — Ireland/UK",
    "location": "Ireland / UK",
    "website": "",
    "description": "Hotel booking technology and direct booking solutions.",
    "topics": "direct bookings, hospitality technology, hotel revenue, OTA commission, website conversion, digital marketing",
    "tone": "",
    "avoid": "",
    "budget": "",
    "briefing": "",
    "prospect": false,
    "active": true
  },
  {
    "name": "Orchardleigh",
    "industry": "Events estate — Somerset",
    "location": "Somerset",
    "website": "",
    "description": "Estate venue for weddings, events and luxury stays.",
    "topics": "wedding venues, country estates, luxury events, exclusive hire, outdoor weddings, Somerset",
    "tone": "",
    "avoid": "",
    "budget": "",
    "briefing": "",
    "prospect": false,
    "active": true
  },
  {
    "name": "OSS Systems",
    "industry": "Hospitality technology — UK",
    "location": "UK",
    "website": "",
    "description": "Technology solutions for hospitality and leisure businesses.",
    "topics": "hospitality technology, hotel PMS, restaurant EPOS, operations, leisure software",
    "tone": "",
    "avoid": "",
    "budget": "",
    "briefing": "",
    "prospect": false,
    "active": true
  },
  {
    "name": "Park View Gloucester",
    "industry": "Care home — Gloucester",
    "location": "Gloucester",
    "website": "",
    "description": "Care home providing residential and nursing care.",
    "topics": "care home quality, elderly care Gloucestershire, nursing care, CQC",
    "tone": "",
    "avoid": "",
    "budget": "",
    "briefing": "",
    "prospect": false,
    "active": true
  },
  {
    "name": "Pic PR",
    "industry": "PR & Communications",
    "location": "Worcestershire",
    "website": "https://www.picpr.com",
    "description": "Full-service PR agency specialising in hospitality, care and consumer brands.",
    "topics": "PR industry trends, communications, agency news, creative campaigns, brand strategy, media relations",
    "tone": "",
    "avoid": "",
    "budget": "",
    "briefing": "",
    "prospect": false,
    "active": true
  },
  {
    "name": "RAW Charging",
    "industry": "EV charging — UK",
    "location": "UK",
    "website": "",
    "description": "Electric vehicle charging network and infrastructure provider.",
    "topics": "EV charging, electric vehicles, sustainability, net zero, green transport, fleet electrification",
    "tone": "Down-to-earth, local-first, consumer-friendly",
    "avoid": "",
    "budget": "",
    "briefing": "",
    "prospect": false,
    "active": true
  },
  {
    "name": "Sona (Care)",
    "industry": "Care workforce tech — UK",
    "location": "UK",
    "website": "",
    "description": "Workforce management technology for the care sector.",
    "topics": "care staff scheduling, retention, social care workforce, care technology, staff wellbeing, agency costs",
    "tone": "Human-first care tech – emotive, stat-backed, never guilt-tripping",
    "avoid": "Shaming care managers about inefficiency",
    "budget": "",
    "briefing": "",
    "prospect": false,
    "active": true
  },
  {
    "name": "The Wesley",
    "industry": "Hospitality & conferencing — London",
    "location": "London",
    "website": "",
    "description": "Hotel and conference venue in London.",
    "topics": "London hotels, conference venues, business travel, event spaces, corporate hospitality",
    "tone": "Purposeful and warm – ethical hotel with social justice roots",
    "avoid": "",
    "budget": "",
    "briefing": "",
    "prospect": false,
    "active": true
  },
  {
    "name": "Venelle",
    "industry": "Luxury home care — UK",
    "location": "UK",
    "website": "",
    "description": "Luxury home care and domiciliary care provider.",
    "topics": "luxury home care, private care, elderly care at home, premium care, private nursing, high-net-worth",
    "tone": "Premium, stylish, witty – concierge polish with a playful streak",
    "avoid": "Direct client profiling, naming or interviews – privacy-led, stories via PAs only",
    "budget": "",
    "briefing": "",
    "prospect": false,
    "active": true
  },
  {
    "name": "Wellbeing Care",
    "industry": "Care provider — UK",
    "location": "UK",
    "website": "",
    "description": "Care provider focused on wellbeing-led care services.",
    "topics": "elderly wellbeing, care innovation, person-centred care, mental health in care, activities, holistic care",
    "tone": "",
    "avoid": "",
    "budget": "",
    "briefing": "",
    "prospect": false,
    "active": true
  },
  {
    "name": "WellChild",
    "industry": "Children's charity — UK",
    "location": "UK",
    "website": "",
    "description": "National charity for seriously ill children helping them get the best care.",
    "topics": "children's health, seriously ill children, family support, NHS children's services, young carers",
    "tone": "Emotive, hopeful, family-centred",
    "avoid": "Anything flippant or humour-led around seriously ill children",
    "budget": "",
    "briefing": "",
    "prospect": false,
    "active": true
  },
  {
    "name": "White Ribbon UK",
    "industry": "Charity — UK",
    "location": "UK",
    "website": "",
    "description": "Charity working to end male violence against women through education and campaigning.",
    "topics": "violence against women, VAWG, domestic abuse, gender equality, male allies, consent education, White Ribbon Day",
    "tone": "Serious, campaigning, purposeful",
    "avoid": "Humour; anything trivialising violence against women",
    "budget": "",
    "briefing": "",
    "prospect": false,
    "active": true
  },
  {
    "name": "You & I Care",
    "industry": "Home care — UK",
    "location": "UK",
    "website": "",
    "description": "Home care and domiciliary care provider.",
    "topics": "home care, domiciliary care, live-in care, care worker recruitment, home care regulation",
    "tone": "",
    "avoid": "",
    "budget": "",
    "briefing": "",
    "prospect": false,
    "active": true
  }
];
