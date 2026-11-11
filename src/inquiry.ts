export type InquiryInput = {
  name: string;
  company: string;
  email: string;
  interest: string;
  message: string;
};

export type InquiryField = "name" | "email" | "message";

export type InquiryResult = {
  readonly sent: false;
  readonly stored: false;
  readonly fieldErrors: Partial<Record<InquiryField, string>>;
  readonly status: string;
};

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const STATUS_INCOMPLETE =
  "Poruka nije poslana. Dopunite označena polja. Obrazac nije povezan, podaci se ne šalju i ne spremaju.";

export const STATUS_COMPLETE =
  "Poruka nije poslana. Obrazac još nije povezan s poštom ni poslužiteljem. Upit nije proslijeđen i nije spremljen.";

const FIELD_ERRORS = {
  name: "Upišite ime i prezime.",
  emailEmpty: "Upišite adresu e-pošte.",
  emailShape: "Upišite adresu u prepoznatljivom obliku. Ništa se ne šalje.",
  message: "Upišite poruku od barem 10 znakova.",
} as const;

export function reviewInquiry(input: InquiryInput): InquiryResult {
  const fieldErrors: InquiryResult["fieldErrors"] = {};
  const name = input.name.trim();
  const email = input.email.trim();
  const message = input.message.trim();

  if (!name) fieldErrors.name = FIELD_ERRORS.name;
  if (!email) fieldErrors.email = FIELD_ERRORS.emailEmpty;
  else if (!EMAIL_SHAPE.test(email)) fieldErrors.email = FIELD_ERRORS.emailShape;
  if (message.length < 10) fieldErrors.message = FIELD_ERRORS.message;

  return {
    sent: false,
    stored: false,
    fieldErrors,
    status: Object.keys(fieldErrors).length > 0 ? STATUS_INCOMPLETE : STATUS_COMPLETE,
  };
}
