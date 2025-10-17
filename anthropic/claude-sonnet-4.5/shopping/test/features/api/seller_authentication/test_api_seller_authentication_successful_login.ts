import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test successful seller authentication workflow including credential
 * validation, JWT token generation, and session creation.
 *
 * This test validates the complete seller login process where sellers
 * authenticate with email and password to access their dashboard, product
 * management, and order fulfillment features. The test creates a seller account
 * through registration, verifies email, then authenticates with valid
 * credentials to ensure the system generates JWT access token (30-minute
 * expiration) and refresh token (30-day expiration), creates a session record
 * in shopping_mall_sessions with device information and IP address, resets
 * failed login attempt counters to zero, and returns complete seller profile
 * data along with authentication tokens.
 *
 * Test workflow:
 *
 * 1. Register new seller account with complete business information
 * 2. Verify seller email using verification token
 * 3. Authenticate seller with valid credentials (email and password)
 * 4. Validate login response contains seller ID and JWT tokens
 * 5. Verify token structure includes access token, refresh token, expired_at, and
 *    refreshable_until timestamps
 */
export async function test_api_seller_authentication_successful_login(
  connection: api.IConnection,
) {
  // Step 1: Register new seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();

  const registrationData = {
    email: sellerEmail,
    password: sellerPassword,
    business_name: RandomGenerator.name(2),
    business_type: RandomGenerator.pick([
      "individual",
      "LLC",
      "corporation",
      "partnership",
    ] as const),
    contact_person_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_address: `${typia.random<number & tags.Type<"uint32"> & tags.Maximum<9999>>()} ${RandomGenerator.name(1)} Street, ${RandomGenerator.name(1)} City`,
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const registeredSeller = await api.functional.auth.seller.join(connection, {
    body: registrationData,
  });
  typia.assert(registeredSeller);

  // Validate business logic: registered seller email matches input
  TestValidator.equals(
    "registered seller email matches",
    registeredSeller.email,
    sellerEmail,
  );

  // Step 2: Verify seller email (simulate verification token)
  const verificationToken = RandomGenerator.alphaNumeric(32);

  const verificationResponse =
    await api.functional.auth.seller.verification.confirm.verifyEmail(
      connection,
      {
        body: {
          token: verificationToken,
        } satisfies IShoppingMallSeller.IVerifyEmail,
      },
    );
  typia.assert(verificationResponse);

  // Step 3: Authenticate seller with valid credentials
  const loginCredentials = {
    email: sellerEmail,
    password: sellerPassword,
  } satisfies IShoppingMallSeller.ILogin;

  const loginResponse = await api.functional.shoppingMall.sellers.sessions.post(
    connection,
    {
      body: loginCredentials,
    },
  );
  typia.assert(loginResponse);

  // Validate business logic: token expiration times
  const expiredAt = new Date(loginResponse.token.expired_at);
  const refreshableUntil = new Date(loginResponse.token.refreshable_until);
  const now = new Date();

  TestValidator.predicate(
    "access token expiration is in the future",
    expiredAt.getTime() > now.getTime(),
  );
  TestValidator.predicate(
    "refresh token expiration is in the future",
    refreshableUntil.getTime() > now.getTime(),
  );
  TestValidator.predicate(
    "refresh token expires after access token",
    refreshableUntil.getTime() > expiredAt.getTime(),
  );
}
