import React from 'react';
import { Globe, MapPin, ExternalLink, Star, MessageSquareQuote } from 'lucide-react';

// Custom sleek TikTok SVG Icon
export const TikTokIcon = ({ className = "w-3.5 h-3.5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743l-.068-.102a2.895 2.895 0 0 1 2.374-4.538c.365 0 .713.068 1.034.192V9.418a6.34 6.34 0 0 0-1.034-.085C6.012 9.333 3.2 12.145 3.2 15.612c0 3.468 2.812 6.28 6.279 6.28 3.468 0 6.28-2.812 6.28-6.28V8.344a8.232 8.232 0 0 0 4.83 1.556V6.455a4.823 4.823 0 0 1-1-.231z" />
  </svg>
);

// Instagram SVG Icon
export const InstagramIcon = ({ className = "w-3.5 h-3.5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

// LinkedIn SVG Icon
export const LinkedInIcon = ({ className = "w-3.5 h-3.5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

// YouTube SVG Icon
export const YouTubeIcon = ({ className = "w-3.5 h-3.5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
    <polygon points="10 15 15 12 10 9 10 15" fill="currentColor" />
  </svg>
);

// Facebook SVG Icon
export const FacebookIcon = ({ className = "w-3.5 h-3.5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

// Twitter / X SVG Icon
export const TwitterIcon = ({ className = "w-3.5 h-3.5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

export const formatSocialUrl = (type, value) => {
  if (!value || !String(value).trim()) return '';
  const trimmed = String(value).trim();

  // If already full URL, return formatted
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Clean handles (strip leading @ or /)
  const cleanHandle = trimmed.replace(/^[@/]+/, '');

  switch (type.toLowerCase()) {
    case 'instagram':
    case 'insta':
    case 'ig':
      return `https://instagram.com/${cleanHandle}`;
    case 'facebook':
    case 'fb':
      return `https://facebook.com/${cleanHandle}`;
    case 'tiktok':
    case 'tt':
      return `https://www.tiktok.com/@${cleanHandle}`;
    case 'linkedin':
    case 'li':
      if (cleanHandle.includes('/')) return `https://www.linkedin.com/${cleanHandle}`;
      return `https://www.linkedin.com/in/${cleanHandle}`;
    case 'youtube':
    case 'yt':
      return `https://www.youtube.com/@${cleanHandle}`;
    case 'twitter':
    case 'x':
      return `https://x.com/${cleanHandle}`;
    case 'website':
    case 'web':
      return `https://${trimmed}`;
    default:
      return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
  }
};

/**
 * Renders badges for social channels & website with clickable links.
 */
export const SocialLinksBadges = ({ lead, size = 'sm' }) => {
  if (!lead) return null;

  const website = lead.website || lead.socials?.website;
  const instagram = lead.instagram || lead.socials?.instagram;
  const facebook = lead.facebook || lead.socials?.facebook;
  const linkedin = lead.linkedin || lead.socials?.linkedin;
  const tiktok = lead.tiktok || lead.socials?.tiktok;
  const youtube = lead.youtube || lead.socials?.youtube;
  const twitter = lead.twitter || lead.socials?.twitter || lead.socials?.x;

  if (!website && !instagram && !facebook && !linkedin && !tiktok && !youtube && !twitter) {
    return null;
  }

  const links = [
    {
      type: 'website',
      label: 'Website',
      val: website,
      url: formatSocialUrl('website', website),
      icon: Globe,
      color: 'bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200'
    },
    {
      type: 'facebook',
      label: 'Facebook',
      val: facebook,
      url: formatSocialUrl('facebook', facebook),
      icon: FacebookIcon,
      color: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200'
    },
    {
      type: 'instagram',
      label: 'Instagram',
      val: instagram,
      url: formatSocialUrl('instagram', instagram),
      icon: InstagramIcon,
      color: 'bg-pink-50 text-pink-600 hover:bg-pink-100 border-pink-200'
    },
    {
      type: 'linkedin',
      label: 'LinkedIn',
      val: linkedin,
      url: formatSocialUrl('linkedin', linkedin),
      icon: LinkedInIcon,
      color: 'bg-sky-50 text-sky-700 hover:bg-sky-100 border-sky-200'
    },
    {
      type: 'tiktok',
      label: 'TikTok',
      val: tiktok,
      url: formatSocialUrl('tiktok', tiktok),
      icon: TikTokIcon,
      color: 'bg-slate-900 text-white hover:bg-black border-slate-900'
    },
    {
      type: 'youtube',
      label: 'YouTube',
      val: youtube,
      url: formatSocialUrl('youtube', youtube),
      icon: YouTubeIcon,
      color: 'bg-rose-50 text-rose-600 hover:bg-rose-100 border-rose-200'
    },
    {
      type: 'twitter',
      label: 'Twitter / X',
      val: twitter,
      url: formatSocialUrl('twitter', twitter),
      icon: TwitterIcon,
      color: 'bg-slate-800 text-slate-100 hover:bg-slate-900 border-slate-700'
    }
  ].filter(l => Boolean(l.val));

  return (
    <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
      {links.map((link) => {
        const IconComponent = link.icon;
        return (
          <a
            key={link.type}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            title={`${link.label}: ${link.val}`}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-all shadow-2xs ${link.color}`}
            onClick={(e) => e.stopPropagation()}
          >
            <IconComponent className="w-3 h-3 shrink-0" />
            <span className="capitalize">{link.type === 'website' ? 'Web' : link.type}</span>
          </a>
        );
      })}
    </div>
  );
};

/**
 * Reviews & Rating Display Component
 * Shows star rating score (e.g. ⭐ 4.8), review count (e.g. 124 reviews), and review text snippet.
 */
export const ReviewsRating = ({ rating, reviewCount, reviews, compact = false, showSnippet = false }) => {
  const hasRating = rating !== undefined && rating !== null && rating !== '' && !isNaN(Number(rating));
  const hasCount = reviewCount !== undefined && reviewCount !== null && reviewCount !== '' && !isNaN(Number(reviewCount));
  const hasReviewText = reviews && String(reviews).trim().length > 0;

  if (!hasRating && !hasCount && !hasReviewText) {
    return null;
  }

  const numRating = hasRating ? Number(rating).toFixed(1) : null;
  const numCount = hasCount ? Number(reviewCount) : null;

  return (
    <div className="inline-flex flex-col gap-1">
      <div className="inline-flex items-center gap-1.5 bg-amber-50/80 border border-amber-200/90 px-2 py-0.5 rounded-lg text-amber-900 text-xs">
        <Star className="w-3 h-3 fill-amber-400 text-amber-500 shrink-0" />
        {numRating && (
          <span className="font-extrabold text-amber-950 font-mono text-[11px]">
            {numRating}
          </span>
        )}
        {numCount !== null && (
          <span className="text-[10px] text-amber-700/90 font-medium">
            ({numCount} {compact ? '' : numCount === 1 ? 'review' : 'reviews'})
          </span>
        )}
      </div>

      {showSnippet && hasReviewText && (
        <p className="text-[11px] text-slate-500 italic flex items-start gap-1 line-clamp-2 max-w-xs mt-0.5">
          <MessageSquareQuote className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
          <span>"{String(reviews).trim()}"</span>
        </p>
      )}
    </div>
  );
};

/**
 * Address & Location with Google Maps Direct Search Link
 */
export const AddressLocation = ({ address, city, state, country, compact = false }) => {
  const parts = [address, city, state, country].filter(p => Boolean(p && String(p).trim()));
  if (parts.length === 0) return null;

  const fullText = parts.join(', ');
  const gmapsQuery = encodeURIComponent(fullText);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${gmapsQuery}`;

  return (
    <div className="inline-flex items-center gap-1.5 text-xs text-slate-600 max-w-full">
      <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
      <span className={`truncate text-[11px] ${compact ? 'max-w-[180px]' : 'max-w-[280px]'}`} title={fullText}>
        {address || `${city || ''}${state ? `, ${state}` : ''}`}
      </span>
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[10px] text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-0.5 shrink-0"
        title="Open in Google Maps"
        onClick={(e) => e.stopPropagation()}
      >
        <span>Maps</span>
        <ExternalLink className="w-2.5 h-2.5" />
      </a>
    </div>
  );
};
