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
 * Ensure todo creation enforces the configured max_active_todos_per_user limit.
 *
 * Business workflow:
 *
 * 1. Register an admin user and become authenticated as that admin.
 * 2. As admin, create a system setting with key "max_active_todos_per_user", value
 *    "2", type "int", and enabled=true.
 * 3. Register a member user and become authenticated as that member.
 * 4. As the member, successfully create 2 active todos.
 * 5. Attempt to create a 3rd active todo and verify that the request fails with a
 *    business-rule error.
 *
 * This test validates that the POST /todoApp/memberUser/todos endpoint consults
 * global configuration and refuses to create more active todos than allowed for
 * a single member user.
 */
export async function test_api_todo_creation_respects_max_active_limit(
  connection: api.IConnection,
) {
  // 1. Register an admin user (also authenticates as admin)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todo-app.test/join",
    referrer: "https://admin.todo-app.test/landing",
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Configure system setting: max_active_todos_per_user = 2
  const settingBody = {
    key: "max_active_todos_per_user",
    value: "2",
    type: "int",
    description:
      "Maximum number of active todos allowed per member user for testing.",
    group: "limits",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const systemSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: settingBody,
    });
  typia.assert(systemSetting);
  TestValidator.equals(
    "system setting key should match configured key",
    systemSetting.key,
    settingBody.key,
  );
  TestValidator.equals(
    "system setting value should match configured value",
    systemSetting.value,
    settingBody.value,
  );
  TestValidator.equals(
    "system setting enabled flag should be true",
    systemSetting.enabled,
    true,
  );

  // 3. Register a member user (also authenticates as member)
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://todo-app.test/signup",
    referrer: "https://todo-app.test/landing",
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const memberAuthorized: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. Create active todos up to the configured limit (2)
  const limit = 2;
  const createdTodos: ITodoAppTodo[] = [];

  for (let i = 0; i < limit; i++) {
    const todoCreateBody = {
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.paragraph({ sentences: 6 }),
      due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      state: "active",
    } satisfies ITodoAppTodo.ICreate;

    const todo: ITodoAppTodo =
      await api.functional.todoApp.memberUser.todos.create(connection, {
        body: todoCreateBody,
      });
    typia.assert(todo);

    TestValidator.equals(
      `created todo ${i + 1} title should match request`,
      todo.title,
      todoCreateBody.title,
    );
    TestValidator.equals(
      `created todo ${i + 1} state should be active`,
      todo.state,
      todoCreateBody.state,
    );

    createdTodos.push(todo);
  }

  TestValidator.equals(
    "number of successfully created todos should equal limit",
    createdTodos.length,
    limit,
  );

  // 5. Attempt to create one more active todo and expect failure
  const overLimitTodoBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    due_date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    state: "active",
  } satisfies ITodoAppTodo.ICreate;

  await TestValidator.error(
    "creating an active todo beyond max_active_todos_per_user should fail",
    async () => {
      await api.functional.todoApp.memberUser.todos.create(connection, {
        body: overLimitTodoBody,
      });
    },
  );
}
