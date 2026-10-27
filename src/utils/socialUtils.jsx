import React from 'react';
import { 
  Globe, 
  Instagram, 
  Linkedin, 
  Youtube 
} from 'lucide-react';

// Custom sleek TikTok SVG Icon
export const TikTokIcon = ({ className = "w-3.5 h-3.5" }) => (
  <svg 
    className={className} 
    viewBox="0 0 24 24" 
    fill="currentColor"
  >
    <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743l-.068-.102a2.895 2.895 0 0 1 2.374-4.538c.365 0 .713.068 1.034.192V9.418a6.34 6.34 0 0 0-1.034-.085C6.012 9.333 3.2 12.145 3.2 15.612c0 3.468 2.812 6.28 6.279 6.28 3.468 0 6.28-2.812 6.28-6.28V8.344a8.232 8.232 0 0 0 4.83 1.556V6.455a4.823 4.823 0 0 1-1-.231z" />
  </svg>
);

export const formatSocialUrl = (type, value) => {
  if (!value || !value.trim()) return '';
  const trimmed = value.trim();

  // If already full URL, return formatted
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Clean handles (strip leading @ or /)
  const cleanHandle = trimmed.replace(/^[@/]+/, '');

  switch (type.toLowerCase()) {
    case 'instagram':
    case 'insta':
      return `https://instagram.com/${cleanHandle}`;
    case 'tiktok':
      return `https://www.tiktok.com/@${cleanHandle}`;
    case 'linkedin':
      if (cleanHandle.includes('/')) return `https://www.linkedin.com/${cleanHandle}`;
      return `https://www.linkedin.com/in/${cleanHandle}`;
    case 'youtube':
    case 'yt':
      return `https://www.youtube.com/@${cleanHandle}`;
    case 'website':
    case 'web':
      return `https://${trimmed}`;
    default:
      return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
  }
};

export const SocialLinksBadges = ({ lead, size = 'sm' }) => {
  if (!lead) return null;

  const { website, instagram, tiktok, linkedin, youtube } = lead;
  if (!website && !instagram && !tiktok && !linkedin && !youtube) {
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
      type: 'instagram',
      label: 'Instagram',
      val: instagram,
      url: formatSocialUrl('instagram', instagram),
      icon: Instagram,
      color: 'bg-pink-50 text-pink-600 hover:bg-pink-100 border-pink-200'
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
      type: 'linkedin',
      label: 'LinkedIn',
      val: linkedin,
      url: formatSocialUrl('linkedin', linkedin),
      icon: Linkedin,
      color: 'bg-sky-50 text-sky-700 hover:bg-sky-100 border-sky-200'
    },
    {
      type: 'youtube',
      label: 'YouTube',
      val: youtube,
      url: formatSocialUrl('youtube', youtube),
      icon: Youtube,
      color: 'bg-rose-50 text-rose-600 hover:bg-rose-100 border-rose-200'
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
            <IconComponent className="w-3 h-3" />
            <span className="capitalize">{link.type === 'website' ? 'Web' : link.type}</span>
          </a>
        );
      })}
    </div>
  );
};
