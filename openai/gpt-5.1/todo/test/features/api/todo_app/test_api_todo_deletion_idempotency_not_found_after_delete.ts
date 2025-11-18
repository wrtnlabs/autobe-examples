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

export async function test_api_todo_deletion_idempotency_not_found_after_delete(
  connection: api.IConnection,
) {
  // 1. Admin bootstrap and system setting enabling todo creation
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorizedFromJoin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(adminAuthorizedFromJoin);

  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppAdminUser.ILogin;

  const adminAuthorizedFromLogin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(adminAuthorizedFromLogin);

  const systemSettingBody = {
    key: "member_todo_creation_enabled",
    value: "true",
    type: "boolean",
    description: "Flag to enable member todo creation in e2e tests",
    group: "todo_feature_flags",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const createdSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: systemSettingBody,
    });
  typia.assert<ITodoAppSystemSetting>(createdSetting);

  // 2. Member registration and login
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const memberJoinBody = {
    email: memberEmail,
    password: memberPassword,
    displayName: RandomGenerator.name(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const memberAuthorizedFromJoin: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ITodoAppMemberUser.IAuthorized>(memberAuthorizedFromJoin);

  const memberLoginBody = {
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserLogin.ICreate;

  const memberAuthorizedFromLogin: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert<ITodoAppMemberUser.IAuthorized>(memberAuthorizedFromLogin);

  // 3. Create the primary todo that will be deleted twice
  const primaryTodoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    due_date: RandomGenerator.date(
      new Date(),
      7 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    state: "active",
  } satisfies ITodoAppTodo.ICreate;

  const primaryTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: primaryTodoCreateBody,
    });
  typia.assert<ITodoAppTodo>(primaryTodo);

  // 4. First deletion: should succeed without error
  await api.functional.todoApp.memberUser.todos.erase(connection, {
    todoId: primaryTodo.id,
  });

  // 5. Create a second todo to verify other data is unaffected by deletions
  const secondaryTodoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    due_date: null,
    state: "active",
  } satisfies ITodoAppTodo.ICreate;

  const secondaryTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: secondaryTodoCreateBody,
    });
  typia.assert<ITodoAppTodo>(secondaryTodo);

  // 6. Second deletion of the same primary todo: expect not-found style error
  await TestValidator.error(
    "second deletion of the same todo should fail with not-found style error",
    async () => {
      await api.functional.todoApp.memberUser.todos.erase(connection, {
        todoId: primaryTodo.id,
      });
    },
  );

  // 7. Create a third todo after the failed deletion to ensure system state is healthy
  const tertiaryTodoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: null,
    due_date: null,
    state: "active",
  } satisfies ITodoAppTodo.ICreate;

  const tertiaryTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: tertiaryTodoCreateBody,
    });
  typia.assert<ITodoAppTodo>(tertiaryTodo);

  // Simple predicate to ensure secondary and tertiary todos are distinct and exist
  TestValidator.notEquals<ITodoAppTodo>(
    "secondary and tertiary todos must have different identifiers",
    secondaryTodo,
    tertiaryTodo,
  );
}
