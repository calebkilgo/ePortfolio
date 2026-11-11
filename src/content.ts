/**
 * content.ts — the only source of site copy.
 *
 * Every visible string on calebkilgo.dev comes from this file. Components
 * hold layout, never words. To change the site's text, edit here.
 *
 * Provenance tags used in comments:
 *   [site]    the previous React site (src/App.js, working tree of 2026-11-10)
 *   [resume]  public/resume.pdf
 *   [brief]   the rebuild brief written by Caleb
 *   [repo]    a public repository under github.com/calebkilgo, read 2026-11-10
 *
 * Nothing here is invented. Where sources disagree or are silent there is a
 * TODO, and the full list is in README.md under "Content to confirm".
 */

/* ── Types ─────────────────────────────────────────────────────────────── */

export interface Link {
  label: string;
  href: string;
  /** Opens off-site. Rendered with an arrow and rel="noopener". */
  external?: boolean;
  /** File download name, for the resume. */
  download?: string;
}

export interface Fact {
  label: string;
  value: string;
}

export interface Step {
  title: string;
  body: string;
}

export interface Figure {
  /** File name inside src/assets/work/. */
  file: string;
  alt: string;
  caption: string;
}

export interface Metric {
  value: string;
  /** Units belong here, in words, not after the numeral. */
  label: string;
}

export interface Project {
  slug: string;
  title: string;
  /** Second line under the title on its own page. */
  descriptor: string;
  kind: 'Project' | 'Research';
  /** One line. What it is for. */
  purpose: string;
  /** What I built. Two to four statements. */
  built: string[];
  overview: string;
  year: string | null;
  role: string | null;
  status: string | null;
  stack: string[];
  links: Link[];
  /** Label/value rows: specifications, problem, constraint. */
  specs: Fact[];
  /** Ordered system description. */
  system: Step[];
  metrics: Metric[];
  limits: string[];
  figures: Figure[];
}

export interface SkillGroup {
  label: string;
  items: string[];
}

export interface LogEntry {
  when: string;
  what: string;
  where: string;
  note?: string;
}

/* ── Site ──────────────────────────────────────────────────────────────── */

export const site = {
  url: 'https://www.calebkilgo.dev',
  name: 'Caleb Kilgo',
  /** <title> of the home page. */
  title: 'Caleb Kilgo · Orbital tracking, offline RAG, flight software',
  /** Meta description. [brief] */
  description:
    'CS student at the University of Alabama in Huntsville. Orbital tracking, offline RAG systems, and requirement-to-code traceability for NASA flight software.',
  locale: 'en-US',
  /** schema.org Person, for search engines. [resume], [brief] */
  person: {
    jobTitle: 'Undergraduate Data Science Research Assistant',
    affiliation: 'University of Alabama in Huntsville',
    locality: 'Huntsville',
    region: 'AL',
    country: 'US',
    knowsAbout: [
      'Orbital mechanics software',
      'SGP4 propagation',
      'Retrieval-augmented generation',
      'Requirements traceability',
      'NASA Core Flight System',
      'WebAssembly',
    ],
  },
  /** Used for the local-time readout and the ground-site marker. */
  base: {
    city: 'Huntsville, Alabama',
    short: 'HSV',
    timeZone: 'America/Chicago',
    /** Offset from UTC in minutes outside daylight time, and the two abbreviations. */
    standardOffset: -360,
    zoneNames: { standard: 'CST', daylight: 'CDT' },
    /** City centre, WGS-84 degrees. */
    latitude: 34.7304,
    longitude: -86.5861,
  },
} as const;

/* ── Navigation ────────────────────────────────────────────────────────── */

export const nav = {
  skip: 'Skip to content',
  home: 'Caleb Kilgo',
  label: 'Sections',
  sections: [
    { id: 'work', index: '01', label: 'Work' },
    { id: 'research', index: '02', label: 'Research' },
    { id: 'skills', index: '03', label: 'Skills' },
    { id: 'about', index: '04', label: 'About' },
    { id: 'contact', index: '05', label: 'Contact' },
  ],
  back: 'Index',
} as const;

/* ── Hero ──────────────────────────────────────────────────────────────── */

export const hero = {
  index: '00',
  label: 'Portfolio',
  name: ['Caleb', 'Kilgo'],
  /** [brief] "My work: orbital tracking, offline RAG systems, and
   *  requirement-to-code traceability for NASA flight software (cFS)." */
  lede: 'Orbital tracking, offline RAG systems, and requirement-to-code traceability for NASA flight software.',
  /** [brief] */
  facts: [
    { label: 'Study', value: 'Computer science, University of Alabama in Huntsville' },
    { label: 'Lab', value: 'Research assistant, Integrated Computing Lab' },
    { label: 'Award', value: 'SMART Scholar, sponsored by MDA' },
  ] satisfies Fact[],
} as const;

/* ── Orbit view (hero) ─────────────────────────────────────────────────── */

export const orbit = {
  /** Accessible name of the drawing. */
  alt: 'Line drawing of Earth seen from above the western Atlantic, with dots marking the current positions of tracked satellites.',
  caption: 'Orbit view',
  /** Shown under the drawing. {count} and {epoch} are filled at build time. */
  source: '{count} objects · SGP4 over CelesTrak element sets · epoch {epoch}',
  hint: 'Drag to rotate',
  keyboardHint: 'Orbit view. Arrow keys rotate the globe.',
  targetsLabel: 'Target',
  /** NORAD catalogue numbers that can be selected. Names come from the element sets. */
  targets: [25544, 20580, 48274, 43013],
  site: 'HSV',
  readoutLabel: 'Telemetry',
  readout: {
    local: 'HSV local',
    utc: 'UTC',
    target: 'Target',
    latitude: 'Latitude',
    longitude: 'Longitude',
    altitude: 'Altitude',
    velocity: 'Velocity',
    look: 'From HSV',
  },
  units: {
    acquiring: 'Acquiring',
    idle: '--:--:--',
    kilometres: 'km',
    kilometresPerSecond: 'km/s',
    azimuth: 'Az',
    elevation: 'El',
  },
  /** Shown instead of the live cells when JavaScript is off. */
  staticNote:
    'Positions drawn at build time, {built}. Live telemetry needs JavaScript.',
  groups: {
    stations: 'Stations',
    'gps-ops': 'GPS',
    weather: 'Weather',
    science: 'Science',
  },
} as const;

/* ── Work ──────────────────────────────────────────────────────────────── */

export const work = {
  index: '01',
  title: 'Selected work',
  /** {count} is filled in. */
  meta: '{count} files',
  labels: {
    file: 'File',
    purpose: 'Purpose',
    built: 'Built',
    year: 'Year',
    role: 'Role',
    status: 'Status',
    stack: 'Stack',
    links: 'Links',
    open: 'Open file',
    kind: 'Type',
    overview: 'Overview',
    system: 'System',
    specs: 'Specifications',
    metrics: 'Figures',
    limits: 'Known limits',
    plates: 'Plates',
    plate: 'Plate',
    next: 'Next file',
    previous: 'Previous file',
    all: 'All files',
  },
} as const;

export const projects: Project[] = [
  {
    slug: 'satellite-tracker',
    title: 'Satellite Tracker',
    descriptor: 'Real-time orbital tracker',
    kind: 'Project',
    // [site] + [repo] README, first paragraph.
    purpose:
      'Tracks satellite constellations in real time on a 3D globe, with positions computed by a custom SGP4/SDP4 engine in WebAssembly.',
    built: [
      // [repo] README "Why"
      'An SGP4/SDP4 propagator in C++17 (Vallado 2006), compiled to WebAssembly with Emscripten in place of satellite.js.',
      // [repo] README "Key technical decisions"
      'Batch propagation over pre-allocated heap buffers: one call per frame covers the whole constellation.',
      // [repo] README "Features" + [resume]
      'A CesiumJS interface with group toggles, a 1 Hz telemetry panel, camera lock-on, and ground tracks.',
    ],
    // [site] featured intro, trimmed.
    overview:
      'Live positions for GPS, Starlink, weather, and science satellites on a 3D globe, propagated every frame in the browser. Click a satellite for live telemetry, lock the camera on, and trace its ground track across two full orbits.',
    year: '2026', // [resume] "Jan. 2026 – Present". TODO: first commit in the public repo is 2026-06-04.
    role: 'Sole developer', // TODO confirm. Inferred from [repo]: all 17 commits are yours. The old site never stated a role.
    status: 'Live', // [repo] demo URL answers 200.
    stack: ['C++17', 'WebAssembly', 'React 19', 'Vite 8', 'CesiumJS', 'FastAPI'],
    links: [
      { label: 'Live demo', href: 'https://satellite-tracker-gilt.vercel.app', external: true },
      { label: 'Source', href: 'https://github.com/calebkilgo/satellite-tracker', external: true },
    ],
    // [site] specification table, checked against [repo].
    specs: [
      { label: 'Regimes', value: 'LEO · MEO · GEO' },
      { label: 'Groups', value: 'Stations · GPS · Weather · Science · Starlink' },
      { label: 'Elements', value: 'Live TLE data from CelesTrak' },
      { label: 'Propagator', value: 'SGP4/SDP4, C++17 to WebAssembly (Emscripten)' },
      { label: 'Frontend', value: 'React 19 · Vite 8 · CesiumJS 1.142 · Resium' },
      { label: 'Backend', value: 'Python 3.11 · FastAPI (TLE proxy fallback)' },
      { label: 'Deploy', value: 'Vercel · Render' },
    ],
    // [repo] README "How the Propagator Works" and "Key technical decisions".
    system: [
      {
        title: 'Parse once',
        body: 'Each TLE is parsed a single time into an element record. Initialisation pre-computes the frame-invariant secular coefficients.',
      },
      {
        title: 'Propagate in one call',
        body: 'Every animation frame, one propagateBatch call walks the handle buffer, runs SGP4, converts ECI to WGS-84 geodetic, and writes latitude, longitude, altitude, and speed to an output buffer.',
      },
      {
        title: 'Read the heap',
        body: 'JavaScript reads the results through a Float64Array view on the WASM heap. No per-satellite calls, no garbage on the hot path.',
      },
      {
        title: 'Track without stutter',
        body: 'Camera lock-on uses a preRender listener and camera.lookAt, which avoids the reference-frame switch that makes Cesium’s trackedEntity stutter on first selection.',
      },
      {
        title: 'Split at the dateline',
        body: 'Ground-track polylines are cut at the antimeridian so they render without crossing artifacts.',
      },
    ],
    // [site] stat row, each checked against [repo] README.
    metrics: [
      { value: '5', label: 'Satellite groups' },
      { value: '1', label: 'WASM call per frame' },
      { value: '10', label: 'Ground-track step, seconds' },
      { value: '2', label: 'Orbital periods per track' },
    ],
    // [repo] README "Known Limitations".
    limits: [
      'Deep-space objects (period of 225 minutes or more) use secular-only perturbations. The lunar-solar resonance terms of full SDP4 are not implemented, so those positions drift over multi-day propagations.',
      'Starlink is off by default: loading more than 5,000 objects affects frame rate on lower-end hardware.',
    ],
    // [repo] docs/ST1.png and docs/ST2.png.
    figures: [
      {
        file: 'satellite-tracker-01.png',
        alt: 'Satellite Tracker globe view: Earth centred on North America, colour-coded satellite points around it, and a group selector listing Stations, GPS, Starlink, Weather, and Science.',
        caption: 'Globe view with four groups enabled.',
      },
      {
        file: 'satellite-tracker-02.png',
        alt: 'Satellite Tracker locked on to one satellite above the US east coast: a targeting reticle, its orbital path, and a panel reading latitude, longitude, altitude, and velocity.',
        caption: 'A selected satellite: camera lock-on, orbital path, and the telemetry panel.',
      },
    ],
  },
  {
    slug: 'cfs-traceability',
    title: 'cFS Traceability',
    descriptor: 'Requirement-to-code traceability for NASA flight software',
    kind: 'Research',
    // [site]
    purpose:
      'Maps engineering requirements to source functions in NASA’s Core Flight System, showing what is implemented, what is tested, and where the gaps are.',
    built: [
      // [resume] + [repo] cs-traceability-dataset
      'A traceability dataset from the cFS Checksum (CS) application: 284 ground-truth links across 114 requirements and 65 functions.',
      // [repo] cs-traceability-dataset README
      'BM25-mined hard negatives and grouped splits, so no requirement family leaks between train and test.',
      // [resume]
      'A fine-tuned CoCoSoDa contrastive transformer that retrieves the functions implementing a requirement.',
    ],
    // [resume] bullet 1.
    overview:
      'Automated requirement-to-code traceability for safety-critical NASA and DoD flight software, aimed at a manual verification bottleneck in software assurance.',
    year: '2025', // [resume] "Sep. 2025 – Present". TODO: the old site said "2024 – Present".
    role: 'Undergraduate research assistant', // [resume], [site]
    status: 'Ongoing',
    stack: ['Python', 'PyTorch', 'Pandas', 'Holoviews', 'Bokeh', 'Plotly'], // [site]; PyTorch is from [resume] libraries. TODO confirm PyTorch here.
    links: [
      {
        label: 'Dataset',
        href: 'https://github.com/calebkilgo/cs-traceability-dataset',
        external: true,
      },
    ],
    specs: [
      // [site]
      {
        label: 'Problem',
        value:
          'Requirement-to-code verification in large flight software repositories is manual, slow, and error-prone.',
      },
      // [site]
      {
        label: 'Constraint',
        value:
          'Thousands of C files with inconsistent naming between production and test code.',
      },
      // [repo] dataset README
      { label: 'Corpus', value: 'cFS Checksum (CS) application, production code only' },
      // [resume]
      { label: 'Model', value: 'CoCoSoDa, fine-tuned with InfoNCE loss' },
      // [repo] dataset README
      { label: 'Negatives', value: 'BM25Okapi, two hard negatives per positive' },
      // [resume]
      { label: 'Evaluation', value: 'Leave-one-group-out cross-validation' },
    ],
    // [repo] dataset README, sections "Hard negative mining" and "Splits".
    system: [
      {
        title: 'Collect the ground truth',
        body: 'Each requirement of the Checksum application is paired with the production functions that implement it. Test code is excluded: production functions are the only valid trace targets.',
      },
      {
        title: 'Mine hard negatives',
        body: 'A BM25 index over all 65 functions scores every function against each requirement. The top-ranked functions that are not true links become hard negatives, two per positive.',
      },
      {
        title: 'Split by requirement family',
        body: 'Splits are grouped by CS requirement group (CS1 to CS9), so requirements that share vocabulary never appear on both sides of a split.',
      },
      {
        title: 'Train a dual encoder',
        body: 'CoCoSoDa is fine-tuned with InfoNCE on requirement, positive, and hard-negative triplets, then ranked on held-out groups.',
      },
    ],
    metrics: [
      { value: '284', label: 'Ground-truth links' }, // [resume], [repo] stats.json
      { value: '114', label: 'Requirements' }, // [resume], [repo]
      { value: '65', label: 'Functions' }, // [resume], [repo]
      { value: '0.58', label: 'Test MRR' }, // [resume]
      { value: '0.74', label: 'Recall@10' }, // [resume]
    ],
    limits: [],
    figures: [],
  },
  {
    slug: 'smart-assistant',
    title: 'SMART Assistant',
    descriptor: 'Offline multimodal RAG for automotive service manuals',
    kind: 'Project',
    // [site]
    purpose:
      'A fully offline RAG assistant for automotive service manuals that answers from diagrams and tables, not only prose.',
    built: [
      // [site] steps
      'Ingestion that splits each manual into text, tables, and captioned diagrams, each tagged with page metadata.',
      'Separate FAISS indexes for text and images, so visuals stay searchable.',
      'Retrieval that expands text hits to nearby pages and re-ranks images with a page prior, feeding a local LLM that answers strictly from retrieved context.',
    ],
    // [site]
    overview:
      'The assistant parses each manual into text, tables, and diagrams, then indexes all three so answers can be pulled from visual and tabular content rather than prose alone. Every query is handled by a local model on the device.',
    year: '2026', // [resume] "Jan. 2026 – Present"
    role: 'Two-person team. Shared the architecture, pipeline, and evaluation work.', // [site]
    status: 'In development', // [resume] "Present"
    // [site] minus the image-embedding model.
    // TODO: the old site says CLIP, the resume says SigLIP 2. Add whichever is current.
    stack: ['Python', 'FAISS', 'Ollama', 'Whisper', 'PyMuPDF', 'Streamlit'],
    links: [], // TODO: the public Automobile-RAG repo is an early LangChain/Chroma version, so it is not linked.
    specs: [
      // [site]
      {
        label: 'Problem',
        value:
          'Existing manual search only retrieves from plain text, so information living in wiring diagrams, exploded views, and spec tables was effectively unreachable.',
      },
      // [site]
      {
        label: 'Constraint',
        value: 'Zero cloud calls at query time. Everything runs locally.',
      },
      // [site]
      { label: 'Input', value: 'Typed questions, or voice through Whisper' },
    ],
    // [site] "How it works"
    system: [
      {
        title: 'Ingestion',
        body: 'Manuals are split into text, tables, and captioned diagrams, each tagged with page metadata.',
      },
      {
        title: 'Dual indexing',
        body: 'Text and images are embedded into separate FAISS indexes so visuals stay searchable.',
      },
      {
        title: 'Retrieval',
        body: 'Text expands to nearby pages while images are re-ranked with page-prior scoring.',
      },
      {
        title: 'Generation',
        body: 'A local LLM answers strictly from retrieved context, with voice input via Whisper.',
      },
    ],
    metrics: [],
    limits: [],
    figures: [],
  },
  {
    slug: 'smart-mirror',
    title: 'Smart Mirror',
    descriptor: 'Raspberry Pi mirror with a local voice assistant',
    kind: 'Project',
    // [site]
    purpose:
      'A Raspberry Pi smart mirror that runs a voice assistant on local AI models and shows information through two-way glass.',
    built: [
      // [site] steps
      'The hardware: a Raspberry Pi mounted behind a two-way mirror with a display panel.',
      'Information panels and controls written as custom JavaScript modules.',
      'A local assistant that answers questions and runs tasks on the device, with no cloud.',
    ],
    // [site]
    overview:
      'A personal assistant built into a mirror and running entirely on local hardware. Custom JavaScript modules drive the on-glass display and the assistant interface.',
    year: null, // TODO: no date in any source.
    role: 'Sole developer, from the hardware build to the software modules.', // [site]
    status: null, // TODO: not stated anywhere.
    stack: ['Raspberry Pi', 'JavaScript', 'Node.js', 'Local LLMs'], // [site]
    links: [], // TODO: no repository or photos found.
    specs: [
      // [site]
      {
        label: 'Goal',
        value: 'A personal assistant built into a mirror, running entirely on local hardware.',
      },
      {
        label: 'Build',
        value: 'Custom JavaScript modules drive the on-glass display and the assistant interface.',
      },
    ],
    system: [
      {
        title: 'Hardware',
        body: 'A Raspberry Pi mounted behind a two-way mirror with a display panel.',
      },
      {
        title: 'Custom modules',
        body: 'Information panels and controls written as custom JavaScript modules.',
      },
      {
        title: 'Local assistant',
        body: 'Local AI models answer questions and run assistant tasks on the device, with no cloud.',
      },
    ],
    metrics: [],
    limits: [],
    figures: [],
  },
];

/* ── Research ──────────────────────────────────────────────────────────── */

export const research = {
  index: '02',
  title: 'Research',
  meta: 'Since Sep 2025', // [resume]
  /** Slug of the project file this section summarises. */
  project: 'cfs-traceability',
  heading: 'Requirement-to-code traceability for NASA’s Core Flight System',
  /** [brief] advisor and lab. [resume] the rest. */
  abstract:
    'Flight software has to prove that every requirement is implemented, and today that mapping is traced by hand. With Dr. Cheng Chen in the Integrated Computing Lab at UAH, I am working on retrieving those links automatically: given a requirement, rank the functions that implement it.',
  method:
    'The test bed is the Checksum (CS) application from NASA’s Core Flight System. I built its traceability dataset, mined hard negatives with BM25, and fine-tuned the CoCoSoDa contrastive transformer with InfoNCE. Evaluation is leave-one-group-out, so the model is always scored on a requirement family it has never seen.',
  rows: [
    { label: 'Advisor', value: 'Dr. Cheng Chen' }, // [brief]
    { label: 'Lab', value: 'Integrated Computing Lab, University of Alabama in Huntsville' }, // [brief]
    { label: 'Role', value: 'Undergraduate data science research assistant' }, // [resume]
    { label: 'Target', value: 'Safety-critical NASA and DoD flight software' }, // [resume]
  ] satisfies Fact[],
  datasetLabel: 'Dataset',
  resultsLabel: 'Results',
  more: 'Read the file',
} as const;

/* ── Skills ────────────────────────────────────────────────────────────── */

/**
 * [site] and [resume], regrouped as languages, ML/AI, systems, tools.
 * Left out on purpose (generic on their own; covered by the work above):
 * "Technical Writing", "Visualization".
 */
export const skills = {
  index: '03',
  title: 'Skills',
  groups: [
    {
      label: 'Languages',
      items: ['Python', 'C++', 'JavaScript', 'HTML / CSS'],
    },
    {
      label: 'ML / AI',
      items: [
        'PyTorch',
        'Hugging Face',
        'RAG',
        'LLMs',
        'Embeddings',
        'Contrastive learning',
        'Multimodal retrieval',
        'FAISS',
        'CLIP',
        'Ollama',
        'Whisper',
        'Evaluation',
        'Statistics',
        'Feature engineering',
      ],
    },
    {
      label: 'Systems',
      items: [
        'WebAssembly',
        'React',
        'FastAPI',
        'REST APIs',
        'CesiumJS / Resium',
        'Streamlit',
        'Supabase',
        'Docker',
        'Data structures and algorithms',
        'Requirements engineering',
        'Traceability',
        'Pipeline design',
      ],
    },
    {
      label: 'Tools',
      items: [
        'Git',
        'Vite',
        'Vercel',
        'Google Cloud Platform',
        'Jupyter',
        'NumPy',
        'Pandas',
        'Matplotlib',
        'Plotly',
        'Holoviews',
        'VS Code',
        'Visual Studio',
        'PyCharm',
        'IntelliJ',
      ],
    },
  ] satisfies SkillGroup[],
} as const;

/* ── About ─────────────────────────────────────────────────────────────── */

export const about = {
  index: '04',
  title: 'About',
  /** [brief] + [resume]. */
  body: [
    'I am a computer science student at the University of Alabama in Huntsville, with minors in mathematics and data science.',
    'I work as an undergraduate research assistant in UAH’s Integrated Computing Lab, and I am a SMART Scholar sponsored by the Missile Defense Agency. I am headed into aerospace and defense.',
  ],
  logLabel: 'Record',
  // [resume] dates. TODO: the old site listed research from 2024 and the degree from 2023.
  log: [
    {
      when: '2025 – 2029',
      what: 'B.S. Computer Science',
      where: 'University of Alabama in Huntsville',
      note: 'Minors in mathematics and data science. Expected May 2029.',
    },
    {
      when: 'Sep 2025 –',
      what: 'Undergraduate Data Science Research Assistant',
      where: 'University of Alabama in Huntsville',
      note: 'Requirement-to-code traceability for NASA’s Core Flight System.',
    },
    {
      when: 'May – Aug 2024',
      what: 'Information Technology Assistant',
      where: 'Fort Payne City Schools, Fort Payne, Alabama',
      note: 'Diagnosed and repaired more than 500 Chromebooks. Managed device inventory across the district and resolved support tickets.',
    },
  ] satisfies LogEntry[],
  affiliationsLabel: 'Affiliations',
  // [brief] SMART. [resume] the rest.
  affiliations: [
    { label: 'DoD SMART Scholarship', value: 'Scholar, sponsored by MDA' }, // TODO: add the award year.
    { label: 'UAH i4 Program', value: 'Member since June 2026' },
    { label: 'Data Science and Artificial Intelligence Club', value: 'Member since August 2025' },
    { label: 'Association for Computing Machinery', value: 'Member since August 2025' },
  ] satisfies Fact[],
} as const;

/* ── Contact ───────────────────────────────────────────────────────────── */

export const contact = {
  index: '05',
  title: 'Contact',
  email: 'calebkilgo10@gmail.com', // [site], [resume]
  emailLabel: 'Email',
  // TODO: the old site said "Open to research roles and software engineering internships."
  // Left out until you confirm it still holds alongside the SMART commitment.
  links: [
    { label: 'GitHub', href: 'https://github.com/calebkilgo', external: true },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/caleb-kilgo', external: true },
    { label: 'Résumé (PDF)', href: '/resume.pdf', download: 'Caleb-Kilgo-Resume.pdf' },
  ] satisfies Link[],
  handles: {
    GitHub: 'calebkilgo',
    LinkedIn: 'caleb-kilgo',
    'Résumé (PDF)': 'resume.pdf',
  } as Record<string, string>,
  locationLabel: 'Location',
  location: 'Huntsville, Alabama',
} as const;

/* ── Footer ────────────────────────────────────────────────────────────── */

export const footer = {
  colophonLabel: 'Colophon',
  colophon: [
    'Set in D-DIN (Datto, drawn by Monotype) and Overpass (Delve Fonts for Red Hat), both under the SIL Open Font License.',
    'Orbit view: SGP4 propagation with satellite.js over element sets from CelesTrak. Coastlines from Natural Earth.',
    'Built with Astro. No trackers, no cookies.',
  ],
  buildLabel: 'Build',
  copyright: '© 2026 Caleb Kilgo',
  top: 'Back to top',
} as const;

/* ── 404 ───────────────────────────────────────────────────────────────── */

export const notFound = {
  title: 'File not found · Caleb Kilgo',
  code: '404',
  heading: 'No such file',
  body: 'The address does not match any page on this site.',
  action: 'Return to the index',
} as const;

/* ── Helpers ───────────────────────────────────────────────────────────── */

export function fileNumber(position: number): string {
  return String(position + 1).padStart(2, '0');
}

export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));
}
