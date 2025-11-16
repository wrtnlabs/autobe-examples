import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test the complete workflow of permanently deleting an administrator account
 * from the platform by a super admin.
 *
 * This test validates that a super admin can successfully remove another admin
 * account from the system through hard deletion. The scenario creates two admin
 * accounts - one super admin who will perform the deletion operation and one
 * regular admin who will be the target of deletion. After deletion, the test
 * verifies that the deleted admin's information is returned in the response,
 * confirming the operation completed successfully.
 *
 * Steps:
 *
 * 1. Create super admin account who will perform the deletion
 * 2. Create target admin account to be deleted
 * 3. Authenticate as super admin
 * 4. Delete the target admin account
 * 5. Verify the deletion response contains the deleted admin's information
 */
export async function test_api_admin_account_deletion_by_super_admin(
  connection: api.IConnection,
) {
  // Step 1: Create super admin account
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: superAdminEmail,
        password: typia.random<string & tags.Format<"password">>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        admin_level: "super_admin",
        email_verified: true,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(superAdmin);

  // Step 2: Create target admin account to be deleted
  const targetAdminEmail = typia.random<string & tags.Format<"email">>();
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  const targetAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(unauthConnection, {
      body: {
        email: targetAdminEmail,
        password: typia.random<string & tags.Format<"password">>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        admin_level: "moderator",
        email_verified: true,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(targetAdmin);

  // Step 3: Authenticate as super admin (already authenticated from join)
  // The join operation automatically sets the authorization token

  // Step 4: Delete the target admin account
  const deletedAdmin: IShoppingMallAdmin =
    await api.functional.shoppingMall.admin.admins.erase(connection, {
      adminId: targetAdmin.id,
    });
  typia.assert(deletedAdmin);

  // Step 5: Verify the deletion response
  TestValidator.equals(
    "deleted admin ID matches target",
    deletedAdmin.id,
    targetAdmin.id,
  );
  TestValidator.equals(
    "deleted admin email matches target",
    deletedAdmin.email,
    targetAdmin.email,
  );
  TestValidator.equals(
    "deleted admin full_name matches target",
    deletedAdmin.full_name,
    targetAdmin.full_name,
  );
}
