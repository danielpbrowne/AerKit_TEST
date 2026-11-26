// Synthetic public fixture used by the unauthenticated development build.
// Never put real reference, contact, roster, payroll, or operational data here.
window.AERKIT_PREVIEW_MODE = true;
window.CSM_DATA = {
  informationLastUpdated: 'Sample data only',
  overnightAllowanceVersion: 'Sample rates',
  destinations: [
    { name: 'Sample City', code: 'SMP', country: 'Sample Country', routeStatus: 'Preview route' }
  ],
  destinationFacts: [
    { code: 'SMP', destination: 'Sample City', category: 'Preview details', field: 'Sample note', value: 'This synthetic record is here to preview the destination layout.' }
  ],
  aircraft: [
    { type: 'SAMPLE', registration: 'EI-SMP', business: 8, premiumEconomy: 12, economy: 40, total: 60, cabinCrewSeats: 8, flightDeckRest: 'Yes', cabinCrewRest: 'Yes' }
  ],
  flightSchedule: [],
  usefulContacts: [],
  usefulLinks: [],
  usefulForms: [],
  creditPeriods: [],
  rosterBidPeriods: [],
  overnightAllowanceGroups: []
};
