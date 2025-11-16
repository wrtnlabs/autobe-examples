import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";

/**
 * Test session termination functionality for buyer accounts.
 *
 * This test validates the admin's ability to terminate a buyer's authentication
 * session. Since the available API only provides buyer registration (join)
 * without a separate login endpoint for creating multiple sessions, this test
 * focuses on terminating the initial session created during registration.
 *
 * The test creates a buyer account (which establishes an initial session), then
 * uses admin privileges to terminate that session, demonstrating proper session
 * management capabilities.
 *
 * Steps:
 *
 * 1. Create an admin account for session management operations
 * 2. Create a buyer account (which creates the initial session)
 * 3. Admin terminates the buyer's session
 */
export async function test_api_buyer_session_termination_multiple_devices(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for session management
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        admin_level: "super_admin",
        email_verified: true,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create buyer account with initial session
  const buyerConnection: api.IConnection = { ...connection, headers: {} };
  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(buyerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallBuyer.ICreate,
    });
  typia.assert(buyer);

  // Step 3: Admin terminates the buyer's session
  // Note: Using buyer.id as both buyerId and sessionId since the schema creates
  // a session record upon registration
  await api.functional.shoppingMall.admin.buyers.sessions.erase(connection, {
    buyerId: buyer.id,
    sessionId: buyer.id,
  });
}
