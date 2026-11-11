import { describe, expect, it } from "vitest";
import { reviewInquiry, STATUS_COMPLETE, STATUS_INCOMPLETE } from "../src/inquiry";

const valid = {
  name: "Ana Anić",
  company: "Primjer obrt",
  email: "ana@primjer.hr",
  interest: "3D vizualizacija",
  message: "Trebamo model malog pulta.",
};

describe("reviewInquiry", () => {
  it("nikad ne označi potpun upit kao poslan ili spremljen", () => {
    const result = reviewInquiry(valid);
    expect(result.sent).toBe(false);
    expect(result.stored).toBe(false);
    expect(result.fieldErrors).toEqual({});
    expect(result.status).toBe(STATUS_COMPLETE);
    expect(result.status.toLowerCase()).toContain("nije poslana");
    expect(result.status.toLowerCase()).not.toMatch(/uspješno|hvala|spremljen je/);
    expect(result.status).not.toContain(valid.email);
  });

  it("traži ime, e-poštu i duljinu poruke, ali i dalje ništa ne šalje", () => {
    const result = reviewInquiry({
      name: "  ",
      company: "",
      email: "nije-adresa",
      interest: "",
      message: "kratko",
    });
    expect(result.sent).toBe(false);
    expect(result.stored).toBe(false);
    expect(result.status).toBe(STATUS_INCOMPLETE);
    expect(result.fieldErrors.name).toBeTruthy();
    expect(result.fieldErrors.email).toBeTruthy();
    expect(result.fieldErrors.message).toBeTruthy();
  });

  it("odbija praznu e-poštu i prekratku poruku nakon uklanjanja razmaka", () => {
    const missingEmail = reviewInquiry({ ...valid, email: "   " });
    expect(missingEmail.fieldErrors.email).toMatch(/e-pošte/);
    expect(missingEmail.sent).toBe(false);

    const trimmed = reviewInquiry({ ...valid, name: "  Ana Anić  ", message: "  1234567890  " });
    expect(trimmed.fieldErrors).toEqual({});
    expect(trimmed.sent).toBe(false);

    const nine = reviewInquiry({ ...valid, message: "123456789" });
    expect(nine.fieldErrors.message).toBeTruthy();
    expect(nine.sent).toBe(false);
  });
});
