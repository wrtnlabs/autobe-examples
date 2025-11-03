import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";

/**
 * Test successful seller registration with initial token issuance and duplicate
 * prevention.
 *
 * This test covers the onboarding flow for a new seller. It ensures:
 *
 * 1. A new seller can register with unique business email, password, display name,
 *    and contact phone
 * 2. Upon registration, the API response includes IShoppingSeller.IAuthorized with
 *    JWT access/refresh tokens
 * 3. The returned seller profile status is set to 'pending', and is_active is
 *    true, other onboarding fields are as expected
 * 4. Registration fails if the same business email is used again (duplicate
 *    prevention logic)
 * 5. All KYC and compliance fields are enforced as described (status, tokens,
 *    business onboarding, account eligibility)
 */
export async function test_api_seller_account_registration_initial_tokens(
  connection: api.IConnection,
) {
  // Prepare unique seller registration info
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const displayName = RandomGenerator.name(2);
  const contactPhone = RandomGenerator.mobile();

  const requestBody = {
    email,
    password,
    display_name: displayName,
    contact_phone: contactPhone,
    status: "pending",
  } satisfies IShoppingSeller.IJoin;

  // 1. Register seller (first attempt)
  const seller: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: requestBody });
  typia.assert(seller);

  // 2. Validate profile & tokens in response
  TestValidator.equals("seller email matches", seller.email, email);
  TestValidator.equals(
    "display name matches",
    seller.display_name,
    displayName,
  );
  TestValidator.equals(
    "contact phone matches",
    seller.contact_phone,
    contactPhone,
  );
  TestValidator.equals("status is pending", seller.status, "pending");
  TestValidator.predicate(
    "seller is active by default",
    seller.is_active === true,
  );
  // JWT token fields (access, refresh, expired_at, refreshable_until)
  TestValidator.predicate(
    "response includes JWT token",
    !!seller.token &&
      typeof seller.token.access === "string" &&
      typeof seller.token.refresh === "string",
  );
  TestValidator.predicate(
    "token expiry & refreshable fields exist",
    typeof seller.token.expired_at === "string" &&
      typeof seller.token.refreshable_until === "string",
  );
  // 3. Register duplicate seller (same email)
  await TestValidator.error(
    "duplicate seller registration should fail",
    async () => {
      await api.functional.auth.seller.join(connection, { body: requestBody });
    },
  );
}
