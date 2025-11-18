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

export async function test_api_todo_update_cannot_change_other_member_todo(
  connection: api.IConnection,
) {
  // 1. Bootstrap admin and system settings so todo operations are considered enabled.
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

  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(adminAuthorized);

  const systemSettingBody = {
    key: "max_active_todos_per_user",
    value: "100",
    type: "int",
    description:
      "Maximum number of active todos allowed per member user in tests",
    group: "limits",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const setting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: systemSettingBody,
    });
  typia.assert<ITodoAppSystemSetting>(setting);

  // 2. Member A joins and creates a todo.
  const memberAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberAPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const memberAJoinBody = {
    email: memberAEmail,
    password: memberAPassword,
    displayName: RandomGenerator.name(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const memberAAuthorized: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert<ITodoAppMemberUser.IAuthorized>(memberAAuthorized);

  const createTodoBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    due_date: null,
    state: "active",
  } satisfies ITodoAppTodo.ICreate;

  const todoA: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: createTodoBody,
    });
  typia.assert<ITodoAppTodo>(todoA);

  const todoIdA: string & tags.Format<"uuid"> = todoA.id;
  const ownerMemberId: string & tags.Format<"uuid"> = todoA.memberUser.id;

  // 3. Member B joins and attempts unauthorized update on Member A's todo.
  const memberBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberBPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const memberBJoinBody = {
    email: memberBEmail,
    password: memberBPassword,
    displayName: RandomGenerator.name(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const memberBAuthorized: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert<ITodoAppMemberUser.IAuthorized>(memberBAuthorized);

  const unauthorizedUpdateBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: null,
    state: "completed",
    due_date: null,
  } satisfies ITodoAppTodo.IUpdate;

  await TestValidator.error(
    "member B cannot update member A's todo",
    async () => {
      await api.functional.todoApp.memberUser.todos.update(connection, {
        todoId: todoIdA,
        body: unauthorizedUpdateBody,
      });
    },
  );

  // 4. Switch back to Member A and perform authorized update.
  const memberALoginBody = {
    email: memberAEmail,
    password: memberAPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserLogin.ICreate;

  const memberALogin: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberALoginBody,
    });
  typia.assert<ITodoAppMemberUser.IAuthorized>(memberALogin);

  const authorizedUpdateBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    state: "completed",
    due_date: null,
  } satisfies ITodoAppTodo.IUpdate;

  const expectedTitle: string = authorizedUpdateBody.title!;

  const updatedTodoA: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.update(connection, {
      todoId: todoIdA,
      body: authorizedUpdateBody,
    });
  typia.assert<ITodoAppTodo>(updatedTodoA);

  // Validate that the todo still belongs to Member A and that the authorized update took effect.
  TestValidator.equals(
    "todo owner remains member A after updates",
    updatedTodoA.memberUser.id,
    ownerMemberId,
  );

  TestValidator.equals(
    "authorized owner can update todo title",
    updatedTodoA.title,
    expectedTitle,
  );
}
