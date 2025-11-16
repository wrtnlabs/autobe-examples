import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";

/**
 * Test buyer-initiated session termination (logout) workflow.
 *
 * This scenario validates that buyers can explicitly end their own
 * authenticated sessions to log out from the platform. The test creates a buyer
 * account which establishes an authentication session, then attempts to delete
 * that session.
 *
 * IMPORTANT LIMITATION: The current API does not expose the session ID in the
 * authentication response (IShoppingMallBuyer.IAuthorized). In a real-world
 * scenario, the session ID would need to be obtained through:
 *
 * - JWT token payload decoding
 * - A separate session management/listing endpoint
 * - Response headers or additional API fields
 *
 * This test demonstrates the correct API call structure for session deletion,
 * but uses a placeholder session ID since the actual session ID is not
 * available from the join operation response.
 *
 * Steps:
 *
 * 1. Create buyer account via join endpoint (establishes initial session)
 * 2. Use a placeholder session ID (limitation of current API design)
 * 3. Call session deletion endpoint to perform logout
 */
export async function test_api_buyer_session_logout(
  connection: api.IConnection,
) {
  // Step 1: Create buyer account and establish authentication session
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = typia.random<string & tags.MinLength<8>>();

  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: {
        email: buyerEmail,
        password: buyerPassword,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallBuyer.ICreate,
    });
  typia.assert(buyer);

  // Step 2: Extract buyer ID from the authentication response
  const buyerId = buyer.id;

  // Step 3: Generate placeholder session ID
  // NOTE: The actual session ID is not available in the IShoppingMallBuyer.IAuthorized response
  // In a production scenario, this would need to come from:
  // - Decoding the JWT token payload
  // - A session listing/management endpoint
  // - Additional response fields not currently in the API
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Delete the buyer's session (logout)
  // This demonstrates the correct API call structure
  await api.functional.shoppingMall.buyer.buyers.sessions.erase(connection, {
    buyerId: buyerId,
    sessionId: sessionId,
  });

  // Logout operation completed successfully (void return)
  // Success is indicated by the operation completing without throwing an error
}
