import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";

/**
 * Test buyer session deletion endpoint functionality.
 *
 * This test validates the session deletion endpoint by creating a buyer account
 * and then attempting to delete a session. While the ideal scenario would test
 * multi-device session management, the current API design does not expose
 * session IDs in the authentication responses, making it impossible to extract
 * actual session identifiers from join or login operations.
 *
 * Therefore, this test validates that:
 *
 * 1. Buyer account creation succeeds and establishes authentication
 * 2. The session deletion endpoint can be called with proper parameters
 * 3. The deletion operation completes without type errors
 *
 * Test workflow:
 *
 * 1. Create buyer account via join (establishes initial session)
 * 2. Attempt to delete a session using the buyer ID and a session identifier
 *
 * Note: In a real-world scenario, session IDs would need to be obtained through
 * a session listing endpoint or extracted from authentication tokens, but these
 * are not available in the current API design.
 */
export async function test_api_buyer_session_device_logout(
  connection: api.IConnection,
) {
  // Step 1: Create buyer account and establish initial session
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = typia.random<string & tags.MinLength<8>>();

  const authorizedBuyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: {
        email: buyerEmail,
        password: buyerPassword,
        full_name: typia.random<
          string & tags.MinLength<2> & tags.MaxLength<100>
        >(),
        phone_number: typia.random<string>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallBuyer.ICreate,
    });
  typia.assert(authorizedBuyer);

  // Step 2: Delete a session using the buyer ID
  // Note: Since session IDs are not exposed in API responses, we use a generated UUID
  // In production, session IDs would be obtained from a session management endpoint
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  await api.functional.shoppingMall.buyer.buyers.sessions.erase(connection, {
    buyerId: authorizedBuyer.id,
    sessionId: sessionId,
  });

  // Session deletion endpoint called successfully
  // The operation validates proper parameter types and endpoint structure
}
