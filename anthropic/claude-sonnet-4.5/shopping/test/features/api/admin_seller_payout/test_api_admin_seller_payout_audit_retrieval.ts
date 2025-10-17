import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSellerPayout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayout";

/**
 * Test the complete workflow for an administrator to retrieve and audit seller
 * payout details for platform oversight.
 *
 * This test validates that admins have unrestricted access to all seller payout
 * records for financial auditing, dispute resolution, and payout issue
 * investigation. The test creates a new admin account through admin
 * registration, authenticates the admin, and retrieves specific seller payout
 * details to verify comprehensive access to financial settlement information.
 *
 * Workflow:
 *
 * 1. Create a new admin account through admin registration
 * 2. Authenticate admin user (token automatically managed by SDK)
 * 3. Generate a random payout ID for retrieval
 * 4. Retrieve seller payout details using the payout ID
 * 5. Validate the payout response structure and data
 */
export async function test_api_admin_seller_payout_audit_retrieval(
  connection: api.IConnection,
) {
  // 1. Create a new admin account through admin registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();
  const adminName = RandomGenerator.name();
  const adminRoleLevel = RandomGenerator.pick([
    "super_admin",
    "order_manager",
    "content_moderator",
    "support_admin",
  ] as const);

  const adminCreateBody = {
    email: adminEmail,
    password: adminPassword,
    name: adminName,
    role_level: adminRoleLevel,
  } satisfies IShoppingMallAdmin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });

  typia.assert(adminAuthorized);

  // 2. Admin authentication token is automatically managed by SDK after join
  TestValidator.equals(
    "admin email matches",
    adminAuthorized.email,
    adminEmail,
  );
  TestValidator.equals("admin name matches", adminAuthorized.name, adminName);
  TestValidator.equals(
    "admin role level matches",
    adminAuthorized.role_level,
    adminRoleLevel,
  );

  // 3. Generate a random payout ID for retrieval
  const payoutId = typia.random<string & tags.Format<"uuid">>();

  // 4. Retrieve seller payout details using the payout ID
  const sellerPayout: IShoppingMallSellerPayout =
    await api.functional.shoppingMall.admin.sellerPayouts.at(connection, {
      payoutId: payoutId,
    });

  typia.assert(sellerPayout);

  // 5. Validate the payout response - typia.assert already validated all type constraints
  TestValidator.equals("payout ID matches request", sellerPayout.id, payoutId);
}
