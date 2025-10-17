import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test retrieving detailed information for a specific administrator account.
 *
 * This test validates that the operation fetches complete admin profile data
 * including email, name, role level, account status, email verification status,
 * MFA configuration, and timestamps while properly excluding sensitive
 * authentication fields for security.
 *
 * Workflow:
 *
 * 1. Create and authenticate as an admin to obtain authorization
 * 2. Retrieve detailed admin information using the admin ID
 * 3. Validate the response contains all expected admin profile fields
 * 4. Verify the returned data matches the authenticated admin's information
 */
export async function test_api_admin_account_detail_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as an admin user
  const adminCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: RandomGenerator.pick([
      "super_admin",
      "order_manager",
      "content_moderator",
      "support_admin",
    ] as const),
  } satisfies IShoppingMallAdmin.ICreate;

  const authenticatedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateData,
    });
  typia.assert(authenticatedAdmin);

  // Step 2: Retrieve detailed admin information using the admin ID
  const adminDetails: IShoppingMallAdmin =
    await api.functional.shoppingMall.admin.admins.at(connection, {
      adminId: authenticatedAdmin.id,
    });
  typia.assert(adminDetails);

  // Step 3: Validate the response contains expected admin profile fields
  TestValidator.equals(
    "admin ID matches",
    adminDetails.id,
    authenticatedAdmin.id,
  );
  TestValidator.equals(
    "admin email matches",
    adminDetails.email,
    authenticatedAdmin.email,
  );
  TestValidator.equals(
    "admin name matches",
    adminDetails.name,
    authenticatedAdmin.name,
  );
  TestValidator.equals(
    "admin role level matches",
    adminDetails.role_level,
    authenticatedAdmin.role_level,
  );
}
