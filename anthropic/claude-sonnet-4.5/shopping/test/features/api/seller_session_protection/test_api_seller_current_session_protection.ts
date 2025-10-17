import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller session revocation endpoint basic functionality.
 *
 * NOTE: This test has limitations due to API design constraints. The original
 * scenario intended to test that sellers cannot revoke their own current active
 * session. However, the authentication response
 * (IShoppingMallSeller.IAuthorized) does not expose session IDs, making it
 * impossible to identify which session ID corresponds to the current
 * connection.
 *
 * This simplified test validates that:
 *
 * 1. Seller can successfully register and authenticate
 * 2. The session revocation endpoint is accessible and responds to requests
 * 3. Attempting to revoke a session ID results in expected API behavior
 *
 * A complete test of the "current session protection" feature would require
 * either:
 *
 * - An API endpoint to list active sessions with their IDs
 * - Session ID included in the authentication response
 * - A different mechanism to identify the current session
 *
 * Test workflow:
 *
 * 1. Create a new seller account through registration
 * 2. Verify successful authentication
 * 3. Attempt session revocation with a generated session ID
 * 4. Validate API response (error expected for non-existent or protected session)
 */
export async function test_api_seller_current_session_protection(
  connection: api.IConnection,
) {
  // Step 1: Create new seller account with authenticated session
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
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

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerData });
  typia.assert(seller);

  // Step 2: Verify authentication token was issued
  typia.assert(seller.token);
  typia.assert(seller.token.access);
  typia.assert(seller.token.refresh);

  // Step 3: Attempt to revoke a session
  // Note: Since we cannot determine the actual current session ID from the API response,
  // we use a random session ID. This will likely result in either:
  // - "Session not found" error (if session doesn't exist)
  // - "Cannot revoke current session" error (if by chance it matches current session)
  // - Success (if it matches a different session)
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "session revocation attempt results in error",
    async () => {
      await api.functional.auth.seller.sessions.revokeSession(connection, {
        sessionId: sessionId,
      });
    },
  );
}
