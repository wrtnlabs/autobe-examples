import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Validate full workflow and business constraints for shopping mall admin
 * account deletion.
 *
 * - Authenticate as admin
 * - Register a second (target) admin account
 * - Delete the target admin via DELETE /shoppingMall/admin/admins/{adminId}
 * - Soft-check for constraints by attempting to delete one's own account, which
 *   must be rejected
 * - Ensure that an authenticated admin can only delete another admin, not self or
 *   only remaining
 * - Confirm business logic for preservation of admin quorum when only one admin
 *   exists
 */
export async function test_api_admin_account_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate primary admin
  const admin1Email = typia.random<string & tags.Format<"email">>();
  const admin1Password = RandomGenerator.alphaNumeric(10);
  const admin1: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: admin1Email,
        password: admin1Password,
        name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin1);

  // 2. Register (as primary admin) the second (deletion target) admin
  const admin2Email = typia.random<string & tags.Format<"email">>();
  const admin2Password = RandomGenerator.alphaNumeric(10);
  // stays authenticated as admin1, so the join will create another admin
  const admin2: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: admin2Email,
        password: admin2Password,
        name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin2);

  // 3. As admin1, delete admin2 (should succeed)
  await api.functional.shoppingMall.admin.admins.erase(connection, {
    adminId: admin2.id,
  });

  // 4. Try to delete oneself (should fail)
  await TestValidator.error("admin cannot delete themselves", async () => {
    await api.functional.shoppingMall.admin.admins.erase(connection, {
      adminId: admin1.id,
    });
  });

  // 5. Try to delete when only one admin left (should fail if admin quorum check is enforced)
  // (re-register admin2 for system to have two admins again)
  const admin2b: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin2b);
  // Delete admin2b to leave only admin1
  await api.functional.shoppingMall.admin.admins.erase(connection, {
    adminId: admin2b.id,
  });
  // Try to delete again (should fail)
  await TestValidator.error(
    "last remaining admin cannot be deleted",
    async () => {
      await api.functional.shoppingMall.admin.admins.erase(connection, {
        adminId: admin1.id,
      });
    },
  );
}
