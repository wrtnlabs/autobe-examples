import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test successful seller login with valid credentials.
 *
 * This E2E test validates the complete seller authentication workflow:
 *
 * 1. Create a seller account with comprehensive business information
 * 2. Login using the created credentials
 * 3. Verify the authentication response contains all required seller details
 * 4. Validate JWT token structure and expiration
 * 5. Ensure business information matches the created profile
 */
export async function test_api_seller_login_successful(
  connection: api.IConnection,
) {
  // Generate random seller credentials
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "TestPassword123!";
  const businessName = RandomGenerator.paragraph({ sentences: 2 });
  const contactPerson = RandomGenerator.name();
  const phoneNumber = RandomGenerator.mobile();
  const businessAddress = RandomGenerator.paragraph({ sentences: 3 });
  const baseUrl = "https://example.com";

  // Step 1: Create seller account
  const createdSeller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      business_name: businessName,
      contact_person: contactPerson,
      phone_number: phoneNumber,
      business_address: businessAddress,
      tax_id: undefined,
      ip: undefined,
      href: `${baseUrl}/register`,
      referrer: `${baseUrl}/signup`,
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(createdSeller);

  // Step 2: Login with created credentials
  const loginResponse = await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      ip: undefined,
      href: `${baseUrl}/login`,
      referrer: `${baseUrl}/dashboard`,
      device: undefined,
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(loginResponse);

  // Step 3: Validate business identity consistency
  TestValidator.equals(
    "seller ID should remain consistent between creation and login",
    loginResponse.id,
    createdSeller.id,
  );
  TestValidator.equals(
    "business name should remain consistent",
    loginResponse.business_name,
    createdSeller.business_name,
  );
  TestValidator.equals(
    "contact person should remain consistent",
    loginResponse.contact_person,
    createdSeller.contact_person,
  );
  TestValidator.equals(
    "phone number should remain consistent",
    loginResponse.phone_number,
    createdSeller.phone_number,
  );
  TestValidator.equals(
    "business address should remain consistent",
    loginResponse.business_address,
    createdSeller.business_address,
  );

  // Step 4: Validate authentication response completeness
  TestValidator.predicate(
    "login response should contain valid access token",
    loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "login response should contain valid refresh token",
    loginResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "seller account should have valid status",
    loginResponse.status.length > 0,
  );

  // Step 5: Validate token timestamps are in the future
  const currentTime = new Date();
  const expiredAt = new Date(loginResponse.token.expired_at);
  const refreshableUntil = new Date(loginResponse.token.refreshable_until);

  TestValidator.predicate(
    "access token expiration should be in the future",
    expiredAt > currentTime,
  );
  TestValidator.predicate(
    "refresh token expiration should be in the future",
    refreshableUntil > currentTime,
  );
  TestValidator.predicate(
    "refresh token should have longer validity than access token",
    refreshableUntil > expiredAt,
  );
}
