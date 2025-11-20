import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// --- your criteria ---
const TARGET_COMPANIES = [
  // company slugs as they appear on their ATS
  // examples (you'll replace with real slugs for Rotor-like, UAV, climate-tech orgs)
  { board: 'greenhouse', slug: 'limosa' },
  { board: 'greenhouse', slug: 'mda-space' },
  { board: 'lever', slug: 'clearpath-robotics' },
  { board: 'ashby', slug: 'draganfly' }
];

const KEYWORDS = [
  'aerospace',
  'uav',
  'drone',
  'unmanned',
  'air mobility',
  'robotics',
  'embedded',
  'firmware',
  'autonomy',
  'autonomous',
  'flight test',
  'guidance',
  'navigation',
  'control',
  'px4',
  'ros',
  'ros2',
  'rtos',
  'can bus',
  'bvlos',
  'environmental',
  'climate',
  'reforestation',
  'sustainability'
];

const LOCATION_PREFERENCES = [
  'montreal',
  'quebec',
  'canada',
  'remote',
  'hybrid'
];

// Simple scoring based on your criteria
function scoreJob(job) {
  const text = (
    (job.title || '') +
    ' ' +
    (job.location || '') +
    ' ' +
    (job.description || '')
  ).toLowerCase();

  let score = 0;

  // keywords
  KEYWORDS.forEach(k => {
    if (text.includes(k)) score += 3;
  });

  // location
  LOCATION_PREFERENCES.forEach(loc => {
    if (text.includes(loc)) score += 2;
  });

  // startup-ish signals
  if (text.includes('startup') || text.includes('fast-paced')) score += 2;
  if (text.includes('r&d') || text.includes('research') || text.includes('prototype')) score += 2;

  // mission / climate
  if (text.includes('climate') || text.includes('sustainab') || text.includes('reforest')) score += 3;

  return score;
}

async function fetchJobsFromCompany(board, slug) {
  const url = `https://jobber.mihir.ch/${board}/${slug}`; // public proxy API [web:63]
  const res = await fetch(url);
  if (!res.ok) {
    console.error('Failed to fetch', board, slug, res.status);
    return [];
  }
  // jobber returns: [{ title, location, link }, ...] [web:63]
  const data = await res.json();
  return data.map(j => ({
    title: j.title,
    location: j.location,
    url: j.link,
    description: '', // not available from jobber; you can enrich later
    companySlug: slug,
    board
  }));
}

// main endpoint your Labs front-end will call
app.get('/api/matching-jobs', async (req, res) => {
  try {
    const allJobs = [];

    for (const c of TARGET_COMPANIES) {
      const jobs = await fetchJobsFromCompany(c.board, c.slug);
      allJobs.push(...jobs);
    }

    // score and filter
    const scored = allJobs
      .map(j => ({ ...j, score: scoreJob(j) }))
      .filter(j => j.score >= 5) // threshold; tune as you like
      .sort((a, b) => b.score - a.score);

    res.json(scored);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

app.get('/', (_req, res) => {
  res.send('Job matcher backend is running');
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
