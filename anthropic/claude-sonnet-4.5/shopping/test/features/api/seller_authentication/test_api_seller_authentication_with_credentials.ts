import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller authentication workflow with email and password credentials.
 *
 * This test validates the complete seller authentication flow including:
 *
 * 1. Seller registration with business information
 * 2. Seller login with credentials
 * 3. Token issuance and validation
 * 4. Automatic header management for authenticated requests
 *
 * The test ensures that:
 *
 * - Seller can register with valid business information
 * - Registration returns complete seller profile with authentication tokens
 * - Seller can login with registered credentials
 * - Login returns fresh JWT access and refresh tokens
 * - Authentication tokens are properly formatted
 * - Seller profile data is consistent between registration and login
 * - Connection headers are automatically updated with access token
 */
export async function test_api_seller_authentication_with_credentials(
  connection: api.IConnection,
) {
  // Step 1: Generate random seller registration data
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.MinLength<8>>();
  const businessName = RandomGenerator.name(2);
  const businessTypes = [
    "individual",
    "LLC",
    "corporation",
    "partnership",
  ] as const;
  const businessType = RandomGenerator.pick(businessTypes);
  const contactPersonName = RandomGenerator.name();
  const phone = RandomGenerator.mobile();
  const businessAddress = `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<9999>>()} ${RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 })}`;
  const taxId = RandomGenerator.alphaNumeric(10);

  // Step 2: Register new seller account
  const registrationBody = {
    email: email,
    password: password,
    business_name: businessName,
    business_type: businessType,
    contact_person_name: contactPersonName,
    phone: phone,
    business_address: businessAddress,
    tax_id: taxId,
  } satisfies IShoppingMallSeller.ICreate;

  const registeredSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: registrationBody,
    });
  typia.assert(registeredSeller);

  // Step 3: Validate registration response
  TestValidator.equals(
    "registered seller email matches input",
    registeredSeller.email,
    email,
  );
  TestValidator.equals(
    "registered seller business name matches input",
    registeredSeller.business_name,
    businessName,
  );
  TestValidator.predicate(
    "registered seller has valid ID",
    registeredSeller.id.length > 0,
  );
  TestValidator.predicate(
    "registration token access exists",
    registeredSeller.token.access.length > 0,
  );
  TestValidator.predicate(
    "registration token refresh exists",
    registeredSeller.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "registration token expired_at is valid",
    new Date(registeredSeller.token.expired_at).getTime() > Date.now(),
  );
  TestValidator.predicate(
    "registration token refreshable_until is valid",
    new Date(registeredSeller.token.refreshable_until).getTime() > Date.now(),
  );

  // Step 4: Login with the same credentials
  const loginBody = {
    email: email,
    password: password,
  } satisfies IShoppingMallSeller.ILogin;

  const loggedInSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInSeller);

  // Step 5: Validate login response
  TestValidator.equals(
    "logged in seller ID matches registered seller",
    loggedInSeller.id,
    registeredSeller.id,
  );
  TestValidator.equals(
    "logged in seller email matches input",
    loggedInSeller.email,
    email,
  );
  TestValidator.equals(
    "logged in seller business name matches registered",
    loggedInSeller.business_name,
    registeredSeller.business_name,
  );
  TestValidator.predicate(
    "login token access exists",
    loggedInSeller.token.access.length > 0,
  );
  TestValidator.predicate(
    "login token refresh exists",
    loggedInSeller.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "login token expired_at is valid",
    new Date(loggedInSeller.token.expired_at).getTime() > Date.now(),
  );
  TestValidator.predicate(
    "login token refreshable_until is valid",
    new Date(loggedInSeller.token.refreshable_until).getTime() > Date.now(),
  );

  // Step 6: Verify tokens are fresh (different from registration tokens)
  TestValidator.notEquals(
    "login access token differs from registration",
    loggedInSeller.token.access,
    registeredSeller.token.access,
  );
  TestValidator.notEquals(
    "login refresh token differs from registration",
    loggedInSeller.token.refresh,
    registeredSeller.token.refresh,
  );

  // Step 7: Verify connection headers are automatically updated
  TestValidator.predicate(
    "connection headers contain authorization",
    connection.headers?.Authorization !== undefined,
  );
  TestValidator.equals(
    "connection authorization header matches login token",
    connection.headers?.Authorization,
    loggedInSeller.token.access,
  );
}
