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
 * Validate basic hard deletion flow for member user todos.
 *
 * Business context:
 *
 * - Admin can configure global system settings controlling todo behavior.
 * - Member users own personal todos and can delete their own items.
 *
 * Steps implemented:
 *
 * 1. Register and login an admin user.
 * 2. Create a system setting that simulates normal todo limits/feature flags.
 * 3. Register and login a member user.
 * 4. As the member, create an active todo.
 * 5. Delete the created todo via DELETE /todoApp/memberUser/todos/{todoId}.
 * 6. Optionally, attempt a second deletion to confirm hard-delete semantics via
 *    error expectation.
 */
export async function test_api_todo_deletion_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register an admin user
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminJoinHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const adminJoinReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: "Admin1234!" as string & tags.Format<"password">,
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: adminJoinHref,
    referrer: adminJoinReferrer,
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorizedFromJoin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorizedFromJoin);

  // 2. Login as admin to simulate real admin login flow as well
  const adminLoginHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const adminLoginReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const adminLoginBody = {
    email: adminEmail,
    password: "Admin1234!" as string & tags.Format<"password">,
    ip: "127.0.0.1",
    href: adminLoginHref,
    referrer: adminLoginReferrer,
  } satisfies ITodoAppAdminUser.ILogin;

  const adminAuthorizedFromLogin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedFromLogin);

  TestValidator.equals(
    "admin email should be consistent between join and login",
    adminAuthorizedFromLogin.email,
    adminAuthorizedFromJoin.email,
  );

  // 3. Create system setting that allows normal todo usage
  const systemSettingCreateBody = {
    key: "max_active_todos_per_user",
    value: "100",
    type: "int",
    description:
      "Maximum number of active todos per member user for normal usage.",
    group: "limits",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const systemSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: systemSettingCreateBody,
    });
  typia.assert(systemSetting);

  TestValidator.equals(
    "created system setting key should match request",
    systemSetting.key,
    systemSettingCreateBody.key,
  );

  // 4. Register a member user
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberJoinHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const memberJoinReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const memberJoinBody = {
    email: memberEmail,
    password: typia.random<string & tags.Format<"password">>(),
    displayName: RandomGenerator.name(),
    ip: null,
    href: memberJoinHref,
    referrer: memberJoinReferrer,
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const memberAuthorizedFromJoin: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorizedFromJoin);

  // 5. Login as the same member user
  const memberLoginHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const memberLoginReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const memberLoginBody = {
    email: memberEmail,
    password: memberJoinBody.password,
    ip: null,
    href: memberLoginHref,
    referrer: memberLoginReferrer,
  } satisfies ITodoAppMemberUserLogin.ICreate;

  const memberAuthorizedFromLogin: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedFromLogin);

  TestValidator.equals(
    "member email should be consistent between join and login",
    memberAuthorizedFromLogin.email,
    memberAuthorizedFromJoin.email,
  );

  // 6. Create an active todo for the member user
  const todoTitle: string = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });
  const todoDescription: string = RandomGenerator.paragraph({
    sentences: 8,
    wordMin: 3,
    wordMax: 10,
  });

  const dueDate: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  const todoCreateBody = {
    title: todoTitle,
    description: todoDescription,
    due_date: dueDate,
    state: "active",
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert(createdTodo);

  TestValidator.equals(
    "created todo title should match request",
    createdTodo.title,
    todoCreateBody.title,
  );

  TestValidator.equals(
    "created todo state should be active",
    createdTodo.state,
    todoCreateBody.state,
  );

  TestValidator.equals(
    "created todo owner should be logged-in member",
    createdTodo.memberUser.id,
    memberAuthorizedFromLogin.id,
  );

  // 7. Delete the created todo
  await api.functional.todoApp.memberUser.todos.erase(connection, {
    todoId: createdTodo.id,
  });

  // If we reach this point without throwing, the deletion call succeeded.
  TestValidator.predicate(
    "delete operation for existing todo should complete without error",
    true,
  );

  // 8. Attempt a second deletion to validate hard-delete behavior.
  // If backend enforces not-found semantics, this second call should error.
  await TestValidator.error(
    "deleting an already deleted todo should result in an error",
    async () => {
      await api.functional.todoApp.memberUser.todos.erase(connection, {
        todoId: createdTodo.id,
      });
    },
  );
}
