export const LEAD_STATUSES = {
  NEW:               { label: 'New',              color: 'gray'   },
  CONTACTED:         { label: 'Contacted',         color: 'blue'   },
  MEETING_SCHEDULED: { label: 'Meeting Scheduled', color: 'purple' },
  MEETING_DONE:      { label: 'Meeting Done',      color: 'indigo' },
  FOLLOW_UP:         { label: 'Follow Up',         color: 'yellow' },
  WON:               { label: 'Won',               color: 'green'  },
  LOST:              { label: 'Lost',              color: 'red'    },
  ON_HOLD:           { label: 'On Hold',           color: 'orange' },
};

export const STATUS_PIPELINE = [
  'NEW','CONTACTED','MEETING_SCHEDULED','MEETING_DONE','FOLLOW_UP','WON','LOST','ON_HOLD'
];

export const LEAD_SOURCES = {
  WEBSITE:       { label: 'Website' },
  INSTAGRAM:     { label: 'Instagram' },
  FACEBOOK:      { label: 'Facebook' },
  GOOGLE_ADS:    { label: 'Google Ads' },
  REFERRAL:      { label: 'Referral' },
  WALK_IN:       { label: 'Walk-in' },
  COLD_OUTREACH: { label: 'Cold Outreach' },
  OTHER:         { label: 'Other' },
};

export const PROJECT_TYPES = {
  RESIDENTIAL: { label: 'Residential' },
  COMMERCIAL:  { label: 'Commercial'  },
  OFFICE:      { label: 'Office'      },
  VILLA:       { label: 'Villa'       },
  HOSPITALITY: { label: 'Hospitality' },
  OTHER:       { label: 'Other'       },
};

export const BUDGET_RANGES = {
  BELOW_5L:      { label: 'Below ₹5L'    },
  FIVE_TO_10L:   { label: '₹5L – ₹10L'  },
  TEN_TO_20L:    { label: '₹10L – ₹20L' },
  TWENTY_TO_50L: { label: '₹20L – ₹50L' },
  ABOVE_50L:     { label: 'Above ₹50L'   },
  NOT_DISCLOSED: { label: 'Not disclosed'},
};

export const INTERACTION_TYPES = {
  PHONE_CALL:       { label: 'Phone Call'       },
  WHATSAPP:         { label: 'WhatsApp'         },
  GOOGLE_MEET:      { label: 'Google Meet'      },
  PHYSICAL_MEETING: { label: 'Physical Meeting' },
  EMAIL:            { label: 'Email'            },
  SITE_VISIT:       { label: 'Site Visit'       },
};

export const OUTCOMES = {
  POSITIVE:    { label: 'Positive',    color: 'text-green-600'  },
  NEUTRAL:     { label: 'Neutral',     color: 'text-gray-600'   },
  NEGATIVE:    { label: 'Negative',    color: 'text-red-600'    },
  NO_RESPONSE: { label: 'No Response', color: 'text-yellow-600' },
};

export function getInitials(name) {
  return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
}

export function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  });
}

export function isOverdue(date) {
  return date && new Date(date) < new Date();
}

export function formatCurrency(amount) {
  return 'Rs.' + parseFloat(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}
