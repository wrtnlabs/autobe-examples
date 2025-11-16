import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallBuyerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerSession";

/**
 * Test administrator retrieval of buyer authentication session details.
 *
 * This test validates the admin session retrieval endpoint structure and
 * authorization. Note: Due to API limitations (buyer join response doesn't
 * include session ID and no session listing endpoint exists), this test uses a
 * simulated session ID. In a real scenario, the session ID would be obtained
 * from a session listing endpoint or included in the buyer authentication
 * response.
 *
 * Steps:
 *
 * 1. Create and authenticate admin account
 * 2. Create buyer account (establishes authentication session)
 * 3. Admin retrieves buyer session details using simulated session ID
 * 4. Validate session response structure
 */
export async function test_api_buyer_session_admin_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create admin account with administrative privileges
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
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
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // Step 2: Create buyer account to establish an authentication session
  const buyerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBuyer.ICreate;

  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: buyerCreateBody,
    });
  typia.assert(buyer);

  // Step 3: Admin retrieves the buyer's session details
  // Note: Using simulated session ID since actual session ID is not available in buyer response
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  const session: IShoppingMallBuyerSession =
    await api.functional.shoppingMall.admin.buyers.sessions.at(connection, {
      buyerId: buyer.id,
      sessionId: sessionId,
    });
  typia.assert(session);

  // Step 4: Validate session structure and buyer reference
  TestValidator.equals(
    "session buyer ID matches",
    session.shopping_mall_buyer_id,
    buyer.id,
  );
}
