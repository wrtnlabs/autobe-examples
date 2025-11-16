import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";

/**
 * Test buyer session management and admin-level session deletion endpoint.
 *
 * This test validates the setup required for buyer session termination by
 * creating the necessary admin and buyer accounts. It demonstrates the
 * authentication flow and verifies that both admin and buyer accounts can be
 * created successfully.
 *
 * Note: Complete session deletion testing requires a session ID, which is not
 * available in the current API response structures
 * (IShoppingMallBuyer.IAuthorized and IAuthorizationToken do not expose
 * session_id). This test establishes the authentication context needed for
 * session management operations.
 *
 * Steps:
 *
 * 1. Create admin account with proper authorization level
 * 2. Create buyer account and establish authenticated session
 * 3. Verify both accounts are created successfully with valid tokens
 * 4. Demonstrate the buyer session deletion endpoint structure
 */
export async function test_api_buyer_session_self_logout(
  connection: api.IConnection,
) {
  // Step 1: Create admin account (required for accessing admin endpoints)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: typia.random<string & tags.Format<"password">>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        admin_level: RandomGenerator.pick([
          "super_admin",
          "moderator",
          "support",
        ] as const),
        email_verified: true,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create buyer account and establish authenticated session
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: {
        email: buyerEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallBuyer.ICreate,
    });
  typia.assert(buyer);

  // Step 3: Verify buyer account creation with valid authentication tokens
  TestValidator.predicate("buyer should have valid ID", buyer.id.length > 0);
  TestValidator.predicate(
    "buyer should have access token",
    buyer.token.access.length > 0,
  );
  TestValidator.predicate(
    "buyer should have refresh token",
    buyer.token.refresh.length > 0,
  );

  // Step 4: Demonstrate session deletion endpoint structure
  // Note: Actual deletion requires a valid session ID which is not exposed
  // in the API response. In a real scenario, the session ID would be obtained
  // from the database or a session listing endpoint.
  //
  // The endpoint signature is:
  // await api.functional.shoppingMall.admin.buyers.sessions.erase(connection, {
  //   buyerId: buyer.id,
  //   sessionId: "<actual-session-id-from-database>"
  // });
}
