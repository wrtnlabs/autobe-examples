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
 * Admin updates another admin's email and status with uniqueness respected.
 *
 * Business context:
 *
 * - Admin operators (stored in todo_app_adminusers) can manage other admins.
 * - Email is the primary login identifier and must remain unique.
 * - Admins have a status lifecycle string (e.g., "active") and audit timestamps.
 * - System settings and member todos exist to reflect realistic system activity
 *   but are not directly mutated by the admin update.
 *
 * Scenario steps implemented:
 *
 * 1. Register Admin A via /auth/adminUser/join (becoming the current admin).
 * 2. As Admin A, create a global system setting via
 *    /todoApp/adminUser/systemSettings.
 * 3. Register Admin B via /auth/adminUser/join and capture its id (target of
 *    update).
 * 4. Register Admin C via /auth/adminUser/join to enrich uniqueness context.
 * 5. Register a member user via /auth/memberUser/join.
 * 6. As that member user, create a todo via /todoApp/memberUser/todos.
 * 7. Log back in as Admin A via /auth/adminUser/login to act as the updater.
 * 8. Generate a new unique email for Admin B and call PUT
 *    /todoApp/adminUser/adminUsers/{adminUserId} with ITodoAppAdminUser.IUpdate
 *    to set email, display_name, and status.
 * 9. Validate that the response ITodoAppAdminUser reflects the new email and
 *    status and that the id is unchanged.
 */
export async function test_api_admin_user_update_email_and_status_with_uniqueness_enforcement(
  connection: api.IConnection,
) {
  // 1. Register Admin A (initial operator)
  const adminAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminAPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminAJoinBody = {
    email: adminAEmail,
    password: adminAPassword,
    display_name: RandomGenerator.name(2),
    status: "active",
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppAdminUser.IJoin;

  const adminA: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminAJoinBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(adminA);

  // 2. Create a system setting as Admin A
  const systemSettingBody = {
    key: "max_active_todos_per_user",
    value: "100",
    type: "int",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    group: "limits",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const systemSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: systemSettingBody,
    });
  typia.assert<ITodoAppSystemSetting>(systemSetting);

  // 3. Register Admin B (target of update)
  const adminBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminBPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminBJoinBody = {
    email: adminBEmail,
    password: adminBPassword,
    display_name: RandomGenerator.name(2),
    status: "active",
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppAdminUser.IJoin;

  const adminBAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminBJoinBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(adminBAuthorized);

  const adminBId: string & tags.Format<"uuid"> = adminBAuthorized.id;

  // 4. Register Admin C for additional uniqueness context
  const adminCJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(2),
    status: "active",
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppAdminUser.IJoin;

  const adminC: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminCJoinBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(adminC);

  // 5. Register a member user
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const memberAuthorized: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ITodoAppMemberUser.IAuthorized>(memberAuthorized);

  // 6. As the member user, create a todo
  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    due_date: new Date().toISOString(),
    state: "active",
  } satisfies ITodoAppTodo.ICreate;

  const todo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert<ITodoAppTodo>(todo);

  // 7. Log back in as Admin A to perform the update
  const adminALoginBody = {
    email: adminAEmail,
    password: adminAPassword,
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppAdminUser.ILogin;

  const adminALoggedIn: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminALoginBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(adminALoggedIn);

  // 8. Prepare a new unique email for Admin B
  const newAdminBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  // 9. Update Admin B's email, display_name, and status via adminUsers.update
  const updateBody = {
    email: newAdminBEmail,
    display_name: RandomGenerator.name(2),
    status: "active",
  } satisfies ITodoAppAdminUser.IUpdate;

  const updatedAdminB: ITodoAppAdminUser =
    await api.functional.todoApp.adminUser.adminUsers.update(connection, {
      adminUserId: adminBId,
      body: updateBody,
    });
  typia.assert<ITodoAppAdminUser>(updatedAdminB);

  // 10. Validate updated admin data
  TestValidator.equals(
    "admin B id remains unchanged after update",
    updatedAdminB.id,
    adminBId,
  );

  TestValidator.equals(
    "admin B email updated to new unique value",
    updatedAdminB.email,
    newAdminBEmail,
  );

  TestValidator.equals(
    "admin B status updated to active",
    updatedAdminB.status,
    "active",
  );

  // Ensure updated_at has a valid date-time format (typia.assert already checks
  // this, but we keep a semantic check that it's present and non-empty).
  TestValidator.predicate(
    "updatedAdminB.updated_at is a non-empty string",
    updatedAdminB.updated_at.length > 0,
  );
}
