import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

/**
 * Verify that admin user detail endpoint reflects profile updates performed by
 * another admin.
 *
 * Business context:
 *
 * - Admin accounts are operators of the todoApp backend.
 * - Admin A should be able to update Admin B’s non-sensitive profile fields and
 *   then observe those changes via the detail endpoint.
 *
 * Steps covered:
 *
 * 1. Register Admin A via /auth/adminUser/join.
 * 2. As Admin A, create a baseline system setting via
 *    /todoApp/adminUser/systemSettings.
 * 3. As Admin A, register Admin B via /auth/adminUser/join.
 * 4. Capture Admin B’s original profile fields (id, email, display_name, status,
 *    created_at, updated_at).
 * 5. As Admin A, call PUT /todoApp/adminUser/adminUsers/{adminUserId} to change
 *    display_name and status.
 * 6. Call GET /todoApp/adminUser/adminUsers/{adminUserId} to fetch Admin B’s
 *    detail.
 * 7. Assert that updated display_name and status are reflected, id/created_at stay
 *    unchanged, and updated_at has advanced.
 */
export async function test_api_admin_user_detail_after_profile_update(
  connection: api.IConnection,
) {
  // 1. Register Admin A (actor performing updates)
  const adminAJoinBody = {
    email: `adminA+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "AdminA_password_1!", // any string is fine for & Format<"password">
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todoapp.test/join",
    referrer: "https://admin.todoapp.test/landing",
  } satisfies ITodoAppAdminUser.IJoin;

  const adminA: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminAJoinBody,
    });
  typia.assert(adminA);

  // 2. As Admin A, create a baseline system setting
  const systemSettingBody = {
    key: `max_active_todos_${RandomGenerator.alphaNumeric(6)}`,
    value: "100",
    type: "int",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    group: "limits",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const systemSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: systemSettingBody,
    });
  typia.assert(systemSetting);

  // 3. As Admin A, register Admin B
  const adminBJoinBody = {
    email: `adminB+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "AdminB_password_1!",
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todoapp.test/join",
    referrer: "https://admin.todoapp.test/landing",
  } satisfies ITodoAppAdminUser.IJoin;

  const adminBAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminBJoinBody,
    });
  typia.assert(adminBAuthorized);

  const originalAdminBId = adminBAuthorized.id;
  const originalAdminBEmail = adminBAuthorized.email;
  const originalDisplayName = adminBAuthorized.display_name ?? null;
  const originalStatus = adminBAuthorized.status;
  const originalCreatedAt = adminBAuthorized.created_at;
  const originalUpdatedAt = adminBAuthorized.updated_at;

  // 4. As Admin A, update Admin B profile via PUT /adminUsers/{adminUserId}
  const newDisplayName = RandomGenerator.name();
  const newStatus = "suspended";

  const updateBody = {
    display_name: newDisplayName,
    status: newStatus,
  } satisfies ITodoAppAdminUser.IUpdate;

  const updatedAdminB: ITodoAppAdminUser =
    await api.functional.todoApp.adminUser.adminUsers.update(connection, {
      adminUserId: originalAdminBId,
      body: updateBody,
    });
  typia.assert(updatedAdminB);

  // Business assertions on update response
  TestValidator.equals(
    "updated admin B id should remain unchanged after update",
    updatedAdminB.id,
    originalAdminBId,
  );
  TestValidator.equals(
    "updated admin B email should remain unchanged after update",
    updatedAdminB.email,
    originalAdminBEmail,
  );
  TestValidator.equals(
    "updated admin B display_name should equal newDisplayName in update response",
    updatedAdminB.display_name ?? null,
    newDisplayName,
  );
  TestValidator.equals(
    "updated admin B status should equal newStatus in update response",
    updatedAdminB.status,
    newStatus,
  );
  TestValidator.equals(
    "updated admin B created_at should remain unchanged after update",
    updatedAdminB.created_at,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updated admin B updated_at should differ from original updated_at after update",
    updatedAdminB.updated_at,
    originalUpdatedAt,
  );

  // 5. GET detail for Admin B and verify the persisted state
  const detailAdminB: ITodoAppAdminUser =
    await api.functional.todoApp.adminUser.adminUsers.at(connection, {
      adminUserId: originalAdminBId,
    });
  typia.assert(detailAdminB);

  // Assertions: detail reflects latest state
  TestValidator.equals(
    "detail admin B id should match original id",
    detailAdminB.id,
    originalAdminBId,
  );
  TestValidator.equals(
    "detail admin B email should match original email",
    detailAdminB.email,
    originalAdminBEmail,
  );
  TestValidator.equals(
    "detail admin B display_name should match updated display_name",
    detailAdminB.display_name ?? null,
    newDisplayName,
  );
  TestValidator.equals(
    "detail admin B status should match updated status",
    detailAdminB.status,
    newStatus,
  );
  TestValidator.equals(
    "detail admin B created_at should match original created_at",
    detailAdminB.created_at,
    originalCreatedAt,
  );

  TestValidator.equals(
    "detail admin B updated_at should match updated updated_at from update response",
    detailAdminB.updated_at,
    updatedAdminB.updated_at,
  );

  // Ensure updated_at has advanced relative to original (string inequality already checked)
  TestValidator.notEquals(
    "detail admin B updated_at should differ from original updated_at after update",
    detailAdminB.updated_at,
    originalUpdatedAt,
  );
}
