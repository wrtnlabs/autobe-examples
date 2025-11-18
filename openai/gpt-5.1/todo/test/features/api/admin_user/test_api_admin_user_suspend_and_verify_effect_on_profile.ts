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
 * Validate that an admin can suspend another admin and that the updated profile
 * reflects the new status.
 *
 * Business context:
 *
 * - Admin A manages system configuration and other admin accounts.
 * - Admin B is another admin who should be suspended by Admin A.
 * - Member users and todos exist to reflect a realistic application state, though
 *   they are not directly affected by the suspension.
 *
 * Steps:
 *
 * 1. Register Admin A (via /auth/adminUser/join) and obtain an authenticated admin
 *    session.
 * 2. As Admin A, create at least one system setting (via
 *    /todoApp/adminUser/systemSettings) to simulate admin activity.
 * 3. Still as Admin A, register Admin B (via /auth/adminUser/join) and capture
 *    their id, email, status, and timestamps.
 * 4. Register a member user and create a todo for them to ensure business data
 *    exists.
 * 5. Switch authentication back to Admin A using /auth/adminUser/login so Admin A
 *    performs the suspension.
 * 6. Call PUT /todoApp/adminUser/adminUsers/{adminUserId} for Admin B with
 *    ITodoAppAdminUser.IUpdate, setting status to "suspended" and updating
 *    display_name.
 * 7. Assert that the response has status "suspended", preserves id/email, applies
 *    the new display_name, and advances updated_at while leaving created_at
 *    unchanged.
 */
export async function test_api_admin_user_suspend_and_verify_effect_on_profile(
  connection: api.IConnection,
) {
  // 1. Register Admin A (join)
  const adminAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminAPassword: string & tags.Format<"password"> =
    "AdminA-Password-1" as string & tags.Format<"password">;

  const adminAJoinBody = {
    email: adminAEmail,
    password: adminAPassword,
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todo-app.local/join",
    referrer: "https://admin.todo-app.local/",
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminAJoinBody,
    });
  typia.assert(adminAAuthorized);

  // 2. As Admin A, create a system setting
  const systemSettingCreateBody = {
    key: `max_active_todos_${RandomGenerator.alphaNumeric(8)}`,
    value: "100",
    type: "int",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    group: "limits",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const systemSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: systemSettingCreateBody,
    });
  typia.assert(systemSetting);

  // 3. Register Admin B as another admin
  const adminBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminBPassword: string & tags.Format<"password"> =
    "AdminB-Password-1" as string & tags.Format<"password">;

  const adminBJoinBody = {
    email: adminBEmail,
    password: adminBPassword,
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todo-app.local/join",
    referrer: "https://admin.todo-app.local/",
  } satisfies ITodoAppAdminUser.IJoin;

  const adminBAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminBJoinBody,
    });
  typia.assert(adminBAuthorized);

  const adminBInitialId = adminBAuthorized.id;
  const adminBInitialEmail = adminBAuthorized.email;
  const adminBInitialCreatedAt = adminBAuthorized.created_at;
  const adminBInitialUpdatedAt = adminBAuthorized.updated_at;

  // 4. Create a member user and one todo to simulate app data
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword: string & tags.Format<"password"> =
    "Member-Password-1" as string & tags.Format<"password">;

  const memberJoinBody = {
    email: memberEmail,
    password: memberPassword,
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://todo-app.local/join",
    referrer: "https://todo-app.local/",
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const memberAuthorized: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberLoginBody = {
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://todo-app.local/login",
    referrer: "https://todo-app.local/",
  } satisfies ITodoAppMemberUserLogin.ICreate;

  const memberAuthorizedAfterLogin: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedAfterLogin);

  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    due_date: null,
    state: "active",
  } satisfies ITodoAppTodo.ICreate;

  const todo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert(todo);

  // 5. Switch authentication back to Admin A so Admin A performs the suspension
  const adminALoginBody = {
    email: adminAEmail,
    password: adminAPassword,
    ip: null,
    href: "https://admin.todo-app.local/login",
    referrer: "https://admin.todo-app.local/",
  } satisfies ITodoAppAdminUser.ILogin;

  const adminAAuthorizedAfterLogin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminALoginBody,
    });
  typia.assert(adminAAuthorizedAfterLogin);

  // 6. Admin A suspends Admin B via PUT /todoApp/adminUser/adminUsers/{adminUserId}
  const newDisplayName = `${RandomGenerator.name()} (suspended)`;
  const adminBUpdateBody = {
    display_name: newDisplayName,
    status: "suspended",
  } satisfies ITodoAppAdminUser.IUpdate;

  const updatedAdminB: ITodoAppAdminUser =
    await api.functional.todoApp.adminUser.adminUsers.update(connection, {
      adminUserId: adminBInitialId,
      body: adminBUpdateBody,
    });
  typia.assert(updatedAdminB);

  // 7. Validate updated profile
  TestValidator.equals(
    "admin B id should remain unchanged",
    updatedAdminB.id,
    adminBInitialId,
  );

  TestValidator.equals(
    "admin B email should remain unchanged",
    updatedAdminB.email,
    adminBInitialEmail,
  );

  TestValidator.equals(
    "admin B status should be suspended after update",
    updatedAdminB.status,
    "suspended",
  );

  TestValidator.equals(
    "admin B display_name should be updated",
    updatedAdminB.display_name ?? null,
    newDisplayName,
  );

  TestValidator.equals(
    "admin B created_at should remain unchanged",
    updatedAdminB.created_at,
    adminBInitialCreatedAt,
  );

  const initialUpdatedAtMillis = new Date(adminBInitialUpdatedAt).getTime();
  const updatedUpdatedAtMillis = new Date(updatedAdminB.updated_at).getTime();

  await TestValidator.predicate(
    "admin B updated_at should advance after suspension",
    async () => updatedUpdatedAtMillis > initialUpdatedAtMillis,
  );
}
