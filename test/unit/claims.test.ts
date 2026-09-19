import { describe, expect, it } from "vitest";
import { accessTokenClaimsSchema } from "../../src/zod.js";

// access_token_claims is the cross-repo pin between the platform's pre-token
// trigger (which issues the custom claims) and the API (which requires them).
// These cases mirror both: the exact shape the trigger produces must pass, and
// a token missing a mandatory claim must fail.
describe("access_token_claims", () => {
  it("accepts the token shape the platform's pre-token trigger issues", () => {
    const claims = {
      sub: "6b2f7c3e-1a0f-4f1c-9a4c-2d1c0e8b7a55",
      "custom:tenant_id": "acme",
      roles: JSON.stringify(["admin", "ops"]),
      "cognito:groups": ["admin", "ops"],
      // standard claims the gateway verifies ride along untouched
      iss: "https://cognito-idp.eu-west-2.amazonaws.com/eu-west-2_abc",
      token_use: "access",
    };
    expect(accessTokenClaimsSchema.safeParse(claims).success).toBe(true);
  });

  it("accepts a user in no group (roles absent)", () => {
    expect(accessTokenClaimsSchema.safeParse({ sub: "u", "custom:tenant_id": "t" }).success).toBe(
      true,
    );
  });

  it("rejects a token without a tenant, or with an empty one", () => {
    expect(accessTokenClaimsSchema.safeParse({ sub: "u" }).success).toBe(false);
    expect(accessTokenClaimsSchema.safeParse({ sub: "u", "custom:tenant_id": "" }).success).toBe(
      false,
    );
  });

  it("rejects a token without a subject", () => {
    expect(accessTokenClaimsSchema.safeParse({ "custom:tenant_id": "t" }).success).toBe(false);
  });
});
