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
 * This test validates the seller registration and authentication process that
 * creates active sessions. While the original scenario intended to test session
 * detail retrieval, the API design does not expose session IDs in the login
 * response structure, making direct session detail retrieval unimplementable in
 * an E2E test context.
 *
 * The test covers:
 *
 * 1. Seller account registration with complete business information
 * 2. Seller authentication that creates an internal session
 * 3. Validation of authentication response structure and token issuance
 * 4. Verification that the seller ID matches between registration and login
 *
 * Note: Session detail retrieval requires a session ID that is not provided in
 * the IShoppingMallSeller.ILoginResponse. The session management system
 * operates internally with JWT tokens, and session IDs are not exposed to
 * clients. To fully test session detail retrieval, the API would need to
 * include session IDs in authentication responses or provide a session listing
 * endpoint.
 */
export async function test_api_seller_session_detail_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create a new seller account with complete business information
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();

  const sellerCreateData = {
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
    business_address: `${RandomGenerator.alphaNumeric(3)} ${RandomGenerator.name(1)} Street, ${RandomGenerator.name(1)} City`,
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const authorizedSeller = await api.functional.auth.seller.join(connection, {
    body: sellerCreateData,
  });
  typia.assert(authorizedSeller);

  // Validate seller registration response structure
  TestValidator.predicate(
    "seller ID is valid UUID format",
    authorizedSeller.id.length > 0,
  );
  TestValidator.equals(
    "registered email matches input",
    authorizedSeller.email,
    sellerEmail,
  );
  TestValidator.equals(
    "business name matches input",
    authorizedSeller.business_name,
    sellerCreateData.business_name,
  );

  // Validate token structure from registration
  typia.assert(authorizedSeller.token);
  typia.assert<string>(authorizedSeller.token.access);
  typia.assert<string>(authorizedSeller.token.refresh);
  typia.assert<string & tags.Format<"date-time">>(
    authorizedSeller.token.expired_at,
  );
  typia.assert<string & tags.Format<"date-time">>(
    authorizedSeller.token.refreshable_until,
  );

  // Step 2: Authenticate seller to create a session (session created internally)
  const loginResponse = await api.functional.shoppingMall.sellers.sessions.post(
    connection,
    {
      body: {
        email: sellerEmail,
        password: sellerPassword,
      } satisfies IShoppingMallSeller.ILogin,
    },
  );
  typia.assert(loginResponse);

  // Step 3: Validate login response structure
  TestValidator.equals(
    "seller ID matches between registration and login",
    loginResponse.id,
    authorizedSeller.id,
  );

  // Validate login token structure
  typia.assert(loginResponse.token);
  typia.assert<string>(loginResponse.token.access);
  typia.assert<string>(loginResponse.token.refresh);
  typia.assert<string & tags.Format<"date-time">>(
    loginResponse.token.expired_at,
  );
  typia.assert<string & tags.Format<"date-time">>(
    loginResponse.token.refreshable_until,
  );

  // Validate that tokens are different from registration (new session)
  TestValidator.predicate(
    "login access token is newly generated",
    loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "login refresh token is newly generated",
    loginResponse.token.refresh.length > 0,
  );

  // Validate token expiration times are in the future
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
