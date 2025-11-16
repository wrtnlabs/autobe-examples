import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test the complete update workflow of a platform administrator account by
 * another administrator.
 *
 * This scenario verifies that an existing active admin can successfully update
 * another admin's email (uniqueness enforced), name, password (securely
 * handled), email verification status, and account status in compliance with
 * all business validation rules.
 *
 * Steps:
 *
 * 1. Register primary admin (who will perform updates)
 * 2. Register secondary admin (target of updates)
 * 3. Attempt legal attribute changes: update target admin's email, name, password,
 *    verification and status fields one by one
 * 4. Ensure updated values are persisted and sensitive fields (e.g., password) are
 *    not exposed
 * 5. Ensure that duplicate emails are prohibited and business constraints (e.g.,
 *    cannot demote own account) are enforced
 * 6. Confirm that timestamp fields are updated appropriately
 */
export async function test_api_admin_account_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register primary admin (who will perform updates)
  const admin1Email = typia.random<string & tags.Format<"email">>();
  const admin1Password = RandomGenerator.alphaNumeric(12);
  const admin1Name = RandomGenerator.name();
  const primaryAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: admin1Email,
      password: admin1Password,
      name: admin1Name,
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(primaryAdmin);
  // 2. Register secondary admin (target of updates)
  const admin2Email = typia.random<string & tags.Format<"email">>();
  const admin2Password = RandomGenerator.alphaNumeric(12);
  const admin2Name = RandomGenerator.name();
  const targetAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: admin2Email,
      password: admin2Password,
      name: admin2Name,
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(targetAdmin);
  // 3. Update target admin's email, name, status, and verify emulated password update
  const updateEmail = typia.random<string & tags.Format<"email">>();
  const updateName = RandomGenerator.name();
  const updatePassword = RandomGenerator.alphaNumeric(16);
  const updateStatus = RandomGenerator.pick([
    "active",
    "suspended",
    "revoked",
  ] as const);

  const updated = await api.functional.shoppingMall.admin.admins.update(
    connection,
    {
      adminId: targetAdmin.id,
      body: {
        email: updateEmail,
        name: updateName,
        password: updatePassword,
        is_email_verified: !targetAdmin.is_email_verified,
        status: updateStatus,
      } satisfies IShoppingMallAdmin.IUpdate,
    },
  );
  typia.assert(updated);
  // Validate changed fields
  TestValidator.equals("updated admin email", updated.email, updateEmail);
  TestValidator.equals("updated admin name", updated.name, updateName);
  TestValidator.equals("updated admin status", updated.status, updateStatus);
  TestValidator.equals(
    "email verification toggled",
    updated.is_email_verified,
    !targetAdmin.is_email_verified,
  );
  // Timestamps should be updated: updated_at changes, created_at remains
  TestValidator.equals(
    "created_at unchanged",
    updated.created_at,
    targetAdmin.created_at,
  );
  TestValidator.notEquals(
    "updated_at must change",
    updated.updated_at,
    targetAdmin.updated_at,
  );

  // 4. Ensure password is never leaked after update (check only known fields are present)
  TestValidator.predicate(
    "Updated admin does not expose password field",
    Object.keys(updated).every(
      (key) => key !== "password" && key !== "password_hash" && key !== "hash",
    ),
  );

  // 5. Prohibit update to duplicate email (should fail)
  await TestValidator.error(
    "cannot update to duplicate admin email",
    async () => {
      await api.functional.shoppingMall.admin.admins.update(connection, {
        adminId: targetAdmin.id,
        body: {
          email: admin1Email,
        } satisfies IShoppingMallAdmin.IUpdate,
      });
    },
  );

  // 6. Prohibit self-demotion (admin cannot demote own status)
  await TestValidator.error("admin cannot demote own account", async () => {
    await api.functional.shoppingMall.admin.admins.update(connection, {
      adminId: primaryAdmin.id,
      body: {
        status: RandomGenerator.pick(["suspended", "revoked"] as const),
      } satisfies IShoppingMallAdmin.IUpdate,
    });
  });
}
