import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallBuyerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerSession";

/**
 * Test administrator's ability to inspect buyer sessions for security
 * investigation and fraud detection.
 *
 * This test validates the security audit workflow where administrators need to
 * examine detailed session information during suspicious activity
 * investigations. The scenario establishes an admin context, creates a buyer
 * account with an active session, and retrieves comprehensive session details
 * for security analysis.
 *
 * Steps:
 *
 * 1. Create and authenticate admin account with security audit permissions
 * 2. Create buyer account which establishes initial authentication session
 * 3. Admin retrieves buyer session details for audit review using the buyer's ID
 *    and a session ID
 * 4. Validate all security-relevant fields are present and properly typed
 * 5. Verify session is linked to the correct buyer account
 */
export async function test_api_buyer_session_security_audit(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account for security audit operations
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: "super_admin" as const,
    email_verified: true,
    ip: "192.168.1.100",
    href: "https://admin.shopping-mall.example.com/register",
    referrer: "https://admin.shopping-mall.example.com/login",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Create buyer account which establishes initial authentication session
  const buyerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    ip: "203.0.113.45",
    href: "https://shopping-mall.example.com/register",
    referrer: "https://google.com/search?q=best+shopping+mall",
  } satisfies IShoppingMallBuyer.ICreate;

  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: buyerData,
    });
  typia.assert(buyer);

  // Step 3: Admin retrieves buyer session for security audit
  // Generate a session ID for testing the session retrieval endpoint
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  const session: IShoppingMallBuyerSession =
    await api.functional.shoppingMall.admin.buyers.sessions.at(connection, {
      buyerId: buyer.id,
      sessionId: sessionId,
    });

  // Step 4: Validate session data structure and all security-relevant fields
  typia.assert(session);

  // Step 5: Verify session is linked to correct buyer account
  TestValidator.equals(
    "session belongs to correct buyer",
    session.shopping_mall_buyer_id,
    buyer.id,
  );
}
