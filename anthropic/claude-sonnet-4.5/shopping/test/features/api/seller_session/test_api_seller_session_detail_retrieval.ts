import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSession";

/**
 * Test seller authentication and session creation workflow.
 *
 * This test validates the seller registration and authentication process which
 * establishes sessions with captured metadata. Due to API limitations where the
 * session ID is not exposed in response DTOs, this test focuses on:
 *
 * 1. Registering a new seller account with complete business information
 * 2. Authenticating the seller to establish a session
 * 3. Validating that authentication tokens are properly issued
 *
 * The session is created during authentication and contains device information,
 * location data, and security metadata, but the session ID is not accessible
 * through the current API surface for direct retrieval testing.
 */
export async function test_api_seller_session_detail_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Register a new seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "SecurePass123!";

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
    business_address: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<9999>>() satisfies number as number} ${RandomGenerator.name(1)} Street, ${RandomGenerator.name(1)} City`,
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const registeredSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: registrationData,
    });
  typia.assert(registeredSeller);

  // Validate registration response
  TestValidator.equals(
    "registered seller email matches",
    registeredSeller.email,
    sellerEmail,
  );
  TestValidator.equals(
    "business name matches",
    registeredSeller.business_name,
    registrationData.business_name,
  );
  TestValidator.predicate(
    "seller ID is valid UUID format",
    registeredSeller.id.length > 0,
  );
  TestValidator.predicate(
    "access token is issued",
    registeredSeller.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is issued",
    registeredSeller.token.refresh.length > 0,
  );

  // Step 2: Authenticate seller to create a new session
  const loginData = {
    email: sellerEmail,
    password: sellerPassword,
  } satisfies IShoppingMallSeller.ILogin;

  const loginResponse: IShoppingMallSeller.ILoginResponse =
    await api.functional.shoppingMall.sellers.sessions.post(connection, {
      body: loginData,
    });
  typia.assert(loginResponse);

  // Validate login response
  TestValidator.equals(
    "logged in seller ID matches registered ID",
    loginResponse.id,
    registeredSeller.id,
  );
  TestValidator.predicate(
    "login access token is issued",
    loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "login refresh token is issued",
    loginResponse.token.refresh.length > 0,
  );

  // Validate token expiration timestamps are valid dates
  TestValidator.predicate(
    "access token expiration is valid",
    new Date(loginResponse.token.expired_at).getTime() > Date.now(),
  );

  TestValidator.predicate(
    "refresh token expiration is valid",
    new Date(loginResponse.token.refreshable_until).getTime() > Date.now(),
  );

  // Validate refresh token has longer validity than access token
  TestValidator.predicate(
    "refresh token validity is longer than access token",
    new Date(loginResponse.token.refreshable_until).getTime() >
      new Date(loginResponse.token.expired_at).getTime(),
  );
}
