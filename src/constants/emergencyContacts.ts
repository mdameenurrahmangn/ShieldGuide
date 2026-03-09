export interface EmergencyContact {
  name: string;
  number: string;
  type: 'Police' | 'Medical' | 'Fire' | 'Helpline';
}

export const INDIAN_EMERGENCY_CONTACTS: EmergencyContact[] = [
  { name: "National Emergency Number", number: "112", type: "Helpline" },
  { name: "Police", number: "100", type: "Police" },
  { name: "Fire", number: "101", type: "Fire" },
  { name: "Ambulance", number: "102", type: "Medical" },
  { name: "Women Helpline", number: "1091", type: "Helpline" },
  { name: "Disaster Management", number: "108", type: "Helpline" },
  { name: "Railway Enquiry", number: "139", type: "Helpline" },
];

export const INTERNATIONAL_EMERGENCY_CONTACTS: Record<string, EmergencyContact[]> = {
  "USA/Canada": [
    { name: "Emergency (All)", number: "911", type: "Helpline" },
  ],
  "UK": [
    { name: "Emergency (All)", number: "999", type: "Helpline" },
    { name: "Non-Emergency", number: "101", type: "Helpline" },
  ],
  "European Union": [
    { name: "Emergency (All)", number: "112", type: "Helpline" },
  ],
  "Australia": [
    { name: "Emergency (All)", number: "000", type: "Helpline" },
  ],
};
