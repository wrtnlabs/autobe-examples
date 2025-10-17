import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller session remote termination API endpoint structure and
 * authentication flow.
 *
 * This test validates the API contract for the session termination endpoint by
 * creating a seller account, authenticating to establish seller identity, then
 * calling the session termination endpoint with proper seller ID and a session
 * ID.
 *
 * Note: Due to API design limitations where the login response does not expose
 * the created session ID, this test validates the API endpoint structure and
 * seller authentication flow rather than testing end-to-end session lifecycle
 * management. A complete session management test would require an additional
 * API endpoint to list active sessions or return the session ID during login.
 *
 * Test workflow:
 *
 * 1. Create a new seller account with complete business information
 * 2. Authenticate the seller to establish identity and obtain seller ID
 * 3. Call the session termination endpoint with seller ID and a session ID
 * 4. Verify the API accepts the request structure correctly
 *
 * This validates that sellers can call the session termination API with proper
 * authentication and path parameters, which is the foundation for multi-device
 * session management functionality.
 */
export async function test_api_seller_session_remote_termination(
  connection: api.IConnection,
) {
  // Step 1: Create a new seller account
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
    business_address: `${typia.random<number & tags.Type<"uint32"> & tags.Maximum<9999>>() satisfies number as number} ${RandomGenerator.name(1)} Street, ${RandomGenerator.name(1)} City`,
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const authorizedSeller = await api.functional.auth.seller.join(connection, {
    body: registrationData,
  });
  typia.assert(authorizedSeller);

  // Step 2: Authenticate seller to establish identity and get seller ID
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

  const sellerId = loginResponse.id;

  // Step 3: Generate a session ID (in real scenario, this would come from listing active sessions)
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Call the session termination endpoint
  await api.functional.shoppingMall.seller.sellers.sessions.erase(connection, {
    sellerId: sellerId,
    sessionId: sessionId,
  });

  // Successful execution with void return type indicates the API accepted the request structure
}
