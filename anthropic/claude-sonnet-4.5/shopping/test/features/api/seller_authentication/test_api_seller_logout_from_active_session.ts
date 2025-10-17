import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Tests the complete seller logout workflow from an active authenticated
 * session.
 *
 * This test validates that sellers can successfully terminate their current
 * session, revoke authentication tokens, and clear authentication state. The
 * test creates a seller account, establishes an authenticated session, and then
 * performs logout to ensure the session termination workflow functions
 * correctly.
 *
 * Test Flow:
 *
 * 1. Create a new seller account through registration
 * 2. Authenticate the seller and establish an active session
 * 3. Perform logout to terminate the authenticated session
 * 4. Verify that logout completes successfully with confirmation
 */
export async function test_api_seller_logout_from_active_session(
  connection: api.IConnection,
) {
  // Step 1: Create a new seller account through registration
  const sellerCreateData = {
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
    business_address: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<999>>()} ${RandomGenerator.name()} Street, ${RandomGenerator.name()} City`,
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const registeredSeller = await api.functional.auth.seller.join(connection, {
    body: sellerCreateData,
  });
  typia.assert(registeredSeller);

  // Step 2: Authenticate the seller and establish an active session
  const loginData = {
    email: sellerCreateData.email,
    password: sellerCreateData.password,
  } satisfies IShoppingMallSeller.ILogin;

  const loginResponse = await api.functional.shoppingMall.sellers.sessions.post(
    connection,
    {
      body: loginData,
    },
  );
  typia.assert(loginResponse);

  // Validate that login returned valid tokens and seller ID
  TestValidator.predicate(
    "login response contains seller ID",
    loginResponse.id.length > 0,
  );
  TestValidator.predicate(
    "login response contains access token",
    loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "login response contains refresh token",
    loginResponse.token.refresh.length > 0,
  );

  // Step 3: Perform logout to terminate the authenticated session
  const logoutResponse = await api.functional.auth.seller.logout(connection);
  typia.assert(logoutResponse);

  // Step 4: Verify that logout completed successfully
  TestValidator.predicate(
    "logout response contains confirmation message",
    logoutResponse.message.length > 0,
  );
}
