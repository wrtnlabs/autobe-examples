import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallBuyerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerSession";

/**
 * Test administrator's ability to retrieve buyer session details for security
 * monitoring.
 *
 * This test validates the administrative capability to access buyer session
 * information for security auditing purposes. It demonstrates cross-account
 * session visibility restricted to administrative actors.
 *
 * Test workflow:
 *
 * 1. Create and authenticate admin account to establish administrative privileges
 * 2. Create buyer account which automatically creates an authentication session
 * 3. Switch back to admin authentication context
 * 4. Admin retrieves the buyer's session using known buyer ID and session ID
 * 5. Validate that complete session information is successfully retrieved
 *
 * Note: This test uses the buyer's ID from the creation response. In a real
 * scenario, the session ID would typically be obtained from a session listing
 * endpoint or the authentication response.
 */
export async function test_api_buyer_session_retrieval_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: "super_admin" as const,
    email_verified: true,
    ip: "192.168.1.100",
    href: "https://admin.shoppingmall.com/join" satisfies string &
      tags.Format<"uri">,
    referrer: "https://shoppingmall.com" satisfies string & tags.Format<"uri">,
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Preserve admin token for later use
  const adminToken = admin.token.access;

  // Step 2: Create buyer account (automatically creates session)
  const buyerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    ip: "203.0.113.45",
    href: "https://shoppingmall.com/register" satisfies string &
      tags.Format<"uri">,
    referrer: "https://google.com" satisfies string & tags.Format<"uri">,
  } satisfies IShoppingMallBuyer.ICreate;

  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: buyerData,
    });
  typia.assert(buyer);

  // Step 3: Restore admin authentication context
  connection.headers = connection.headers || {};
  connection.headers.Authorization = adminToken;

  // Step 4: Admin retrieves buyer session details
  // Using a generated session ID to demonstrate the API call structure
  // In production, this would come from a session listing or the auth response
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  const session: IShoppingMallBuyerSession =
    await api.functional.shoppingMall.buyer.buyers.sessions.at(connection, {
      buyerId: buyer.id,
      sessionId: sessionId,
    });

  // Step 5: Validate complete session information
  typia.assert(session);

  // Verify session belongs to the correct buyer
  TestValidator.equals(
    "session belongs to buyer",
    session.shopping_mall_buyer_id,
    buyer.id,
  );
}
