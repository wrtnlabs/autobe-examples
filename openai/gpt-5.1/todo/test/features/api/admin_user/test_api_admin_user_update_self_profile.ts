import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Validate that an authenticated admin can update their own display_name using
 * the generic adminUsers.update endpoint.
 *
 * Business context:
 *
 * - Admin operators are represented by todo_app_adminusers and exposed via
 *   ITodoAppAdminUser/ITodoAppAdminUser.IAuthorized DTOs.
 * - The generic update endpoint PUT /todoApp/adminUser/adminUsers/{adminUserId}
 *   should allow an admin to modify their own non-sensitive profile fields
 *   (display_name, possibly status/email depending on policies).
 * - The scenario focuses on self-service profile editing: Admin A updates their
 *   own display_name while keeping email and status unchanged.
 *
 * Test steps:
 *
 * 1. Register Admin A via /auth/adminUser/join and capture their
 *    ITodoAppAdminUser.IAuthorized data (id, email, status, timestamps).
 * 2. While authenticated as Admin A (token auto-applied by SDK), create a sample
 *    system setting via /todoApp/adminUser/systemSettings to simulate a
 *    realistic admin environment.
 * 3. Register a member user and create at least one todo via /auth/memberUser/join
 *    and /todoApp/memberUser/todos to ensure general application data exists
 *    alongside admin operations.
 * 4. Ensure we are authenticated as Admin A (optionally re-login via
 *    /auth/adminUser/login).
 * 5. Call PUT /todoApp/adminUser/adminUsers/{adminUserId} with Admin A's own id
 *    and a body that sets a new display_name using ITodoAppAdminUser.IUpdate.
 * 6. Validate the response ITodoAppAdminUser:
 *
 *    - Id remains the same as Admin A's original id.
 *    - Email remains unchanged.
 *    - Status remains unchanged (e.g., still "active").
 *    - Display_name has been updated to the new value.
 *    - Created_at is unchanged.
 *    - Updated_at is greater than or equal to the original updated_at.
 */
export async function test_api_admin_user_update_self_profile(
  connection: api.IConnection,
) {
  // 1. Register Admin A
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassword1!",
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(adminAuthorized);

  const originalAdminId = adminAuthorized.id;
  const originalAdminEmail = adminAuthorized.email;
  const originalAdminStatus = adminAuthorized.status;
  const originalCreatedAt = adminAuthorized.created_at;
  const originalUpdatedAt = adminAuthorized.updated_at;

  // 2. Create a system setting as Admin A
  const systemSettingBody = {
    key: `max_active_todos_per_user_${RandomGenerator.alphaNumeric(8)}`,
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
  typia.assert<ITodoAppSystemSetting>(systemSetting);

  // 3. Register a member user and create a todo
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberPassword1!",
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/landing",
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const memberAuthorized: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ITodoAppMemberUser.IAuthorized>(memberAuthorized);

  // Ensure member is logged in (join already authenticates, but this also
  // exercises login flow and confirms credentials work)
  const memberLoginBody = {
    email: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: "127.0.0.1",
    href: "https://app.example.com/login",
    referrer: "https://app.example.com/join",
  } satisfies ITodoAppMemberUserLogin.ICreate;

  const memberAuthorizedAfterLogin: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert<ITodoAppMemberUser.IAuthorized>(memberAuthorizedAfterLogin);

  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    due_date: new Date().toISOString(),
    state: "active",
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert<ITodoAppTodo>(createdTodo);

  // 4. Re-authenticate as Admin A to ensure admin token is active
  const adminLoginBody = {
    email: originalAdminEmail,
    password: adminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/join",
  } satisfies ITodoAppAdminUser.ILogin;

  const adminAuthorizedAfterLogin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(adminAuthorizedAfterLogin);

  TestValidator.equals(
    "admin id should remain same after login",
    adminAuthorizedAfterLogin.id,
    originalAdminId,
  );

  // 5. Self-update: change display_name using adminUsers.update
  const newDisplayName = RandomGenerator.name();
  const adminUpdateBody = {
    display_name: newDisplayName,
  } satisfies ITodoAppAdminUser.IUpdate;

  const updatedAdmin: ITodoAppAdminUser =
    await api.functional.todoApp.adminUser.adminUsers.update(connection, {
      adminUserId: originalAdminId,
      body: adminUpdateBody,
    });
  typia.assert<ITodoAppAdminUser>(updatedAdmin);

  // 6. Validate updated admin fields
  TestValidator.equals(
    "admin id remains unchanged after self-update",
    updatedAdmin.id,
    originalAdminId,
  );
  TestValidator.equals(
    "admin email remains unchanged after self-update",
    updatedAdmin.email,
    originalAdminEmail,
  );
  TestValidator.equals(
    "admin status remains unchanged after self-update",
    updatedAdmin.status,
    originalAdminStatus,
  );
  TestValidator.equals(
    "admin display_name updated to new value",
    updatedAdmin.display_name ?? null,
    newDisplayName,
  );
  TestValidator.equals(
    "created_at remains unchanged after self-update",
    updatedAdmin.created_at,
    originalCreatedAt,
  );

  const originalUpdatedEpoch = Date.parse(originalUpdatedAt);
  const newUpdatedEpoch = Date.parse(updatedAdmin.updated_at);
  TestValidator.predicate(
    "updated_at is greater than or equal to original updated_at",
    newUpdatedEpoch >= originalUpdatedEpoch,
  );
}
