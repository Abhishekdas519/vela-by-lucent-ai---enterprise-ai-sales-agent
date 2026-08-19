import fs from 'fs';
import path from 'path';

function runSEOTests() {
  console.log('================================================================');
  console.log('🔍 RUNNING OPEN SEO & STRUCTURED DATA VERIFICATION SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, title: string, detail?: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`✅ [${total}] ${title}: PASSED`);
      if (detail) console.log(`   ${detail}`);
    } else {
      console.error(`❌ [${total}] ${title}: FAILED`);
      if (detail) console.error(`   ${detail}`);
    }
  }

  // 1. Read index.html
  const indexPath = path.join(process.cwd(), 'index.html');
  const indexHtml = fs.readFileSync(indexPath, 'utf-8');

  // Test 1: Title & Meta Description
  assert(
    indexHtml.includes('<title>Vela by Lucent AI — Enterprise AI Sales Agent') &&
    indexHtml.includes('name="description"') &&
    indexHtml.includes('sub-450ms'),
    'Primary SEO Title & Meta Description',
    'Title and high-intent description detected'
  );

  // Test 2: Canonical & Hreflang
  assert(
    indexHtml.includes('<link rel="canonical" href="https://velabylucentai.in/" />') &&
    indexHtml.includes('<link rel="alternate" hreflang="en" href="https://velabylucentai.in/" />'),
    'Canonical and Hreflang URL Tags',
    'Canonical link points to https://velabylucentai.in/'
  );

  // Test 3: Open Graph Tags
  assert(
    indexHtml.includes('property="og:title"') &&
    indexHtml.includes('property="og:image" content="https://velabylucentai.in/og-image.png"') &&
    indexHtml.includes('property="og:site_name" content="Vela by Lucent AI"'),
    'Open Graph (Facebook / LinkedIn) Tags',
    'og:image, og:title, og:site_name configured'
  );

  // Test 4: Twitter Card Tags
  assert(
    indexHtml.includes('name="twitter:card" content="summary_large_image"') &&
    indexHtml.includes('name="twitter:title"') &&
    indexHtml.includes('name="twitter:image" content="https://velabylucentai.in/og-image.png"'),
    'Twitter / X Card Tags',
    'summary_large_image and Twitter meta tags present'
  );

  // Test 5: JSON-LD Structured Data Schema Validation
  const jsonLdMatch = indexHtml.match(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/i);
  let parsedSchema: any = null;
  let schemaValid = false;
  if (jsonLdMatch && jsonLdMatch[1]) {
    try {
      parsedSchema = JSON.parse(jsonLdMatch[1]);
      schemaValid = Array.isArray(parsedSchema['@graph']) && parsedSchema['@graph'].length >= 5;
    } catch (e: any) {
      console.error('Schema JSON parse error:', e.message);
    }
  }

  assert(
    schemaValid,
    'Google JSON-LD Knowledge Graph Structure',
    `Parsed ${parsedSchema?.['@graph']?.length || 0} top-level schema entities (Organization, WebSite, SoftwareApplication, Breadcrumbs, FAQs)`
  );

  // Test 6: Aggregate Rating & FAQ Schema
  const softwareApp = parsedSchema?.['@graph']?.find((item: any) => item['@type'] === 'SoftwareApplication');
  const faqPage = parsedSchema?.['@graph']?.find((item: any) => item['@type'] === 'FAQPage');
  assert(
    softwareApp?.aggregateRating?.ratingValue === '4.9' &&
    faqPage?.mainEntity?.length >= 5,
    'Google Rich Snippets (4.9-Star Rating & FAQs)',
    `Rating: ${softwareApp?.aggregateRating?.ratingValue}/5 (${softwareApp?.aggregateRating?.reviewCount} reviews) | FAQs: ${faqPage?.mainEntity?.length} questions`
  );

  // Test 7: Robots.txt
  const robotsPath = path.join(process.cwd(), 'public', 'robots.txt');
  const robotsTxt = fs.readFileSync(robotsPath, 'utf-8');
  assert(
    robotsTxt.includes('User-agent: Googlebot') &&
    robotsTxt.includes('Sitemap: https://velabylucentai.in/sitemap.xml'),
    'Crawler Directives (robots.txt)',
    'Googlebot allowed, sitemap referenced'
  );

  // Test 8: Sitemap.xml
  const sitemapPath = path.join(process.cwd(), 'public', 'sitemap.xml');
  const sitemapXml = fs.readFileSync(sitemapPath, 'utf-8');
  assert(
    sitemapXml.includes('<loc>https://velabylucentai.in/</loc>') &&
    sitemapXml.includes('<loc>https://velabylucentai.in/login</loc>') &&
    sitemapXml.includes('<lastmod>2026-08-19</lastmod>'),
    'XML Sitemap Configuration (sitemap.xml)',
    'All canonical landing and portal routes indexed'
  );

  // Test 9: Web App Manifest
  const manifestPath = path.join(process.cwd(), 'public', 'site.webmanifest');
  const manifestJson = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  assert(
    manifestJson.name === 'Vela by Lucent AI' &&
    manifestJson.short_name === 'Vela AI',
    'Web Application Manifest (site.webmanifest)',
    `PWA manifest configured for ${manifestJson.name}`
  );

  console.log(`\n================================================================`);
  console.log(`🎉 SEO TESTS COMPLETED: ${passed}/${total} PASSED (${Math.round(passed/total*100)}%)`);
  console.log(`================================================================\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runSEOTests();
