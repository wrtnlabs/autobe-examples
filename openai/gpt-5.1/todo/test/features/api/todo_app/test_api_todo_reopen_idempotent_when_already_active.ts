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

export async function test_api_todo_reopen_idempotent_when_already_active(
  connection: api.IConnection,
) {
  // 1. Admin joins and configures a basic system setting so that todo feature is in a normal state.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todo-app.test/join",
    referrer: "https://admin.todo-app.test/landing",
  } satisfies ITodoAppAdminUser.IJoin;

  const admin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(admin);

  // Create a simple system setting; actual key/value do not affect reopen semantics.
  const systemSettingBody = {
    key: "max_active_todos_per_user",
    value: "100",
    type: "int",
    description: "Maximum number of active todos per member user in tests",
    group: "limits",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const systemSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: systemSettingBody,
    });
  typia.assert<ITodoAppSystemSetting>(systemSetting);

  // 2. Member user joins (self-registration) and becomes authenticated.
  const memberJoinBody = typia.random<ITodoAppMemberUserJoin.ICreate>();
  const member: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ITodoAppMemberUser.IAuthorized>(member);

  // 3. As this member, create an ACTIVE todo.
  const createTodoBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    due_date: null,
    state: "active",
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: createTodoBody,
    });
  typia.assert<ITodoAppTodo>(createdTodo);

  // Initial lifecycle expectations for a freshly created active todo.
  TestValidator.equals(
    "created todo state should be active as requested",
    createdTodo.state,
    "active",
  );

  TestValidator.equals(
    "created todo completed_at should be null or undefined",
    createdTodo.completed_at ?? null,
    null,
  );

  TestValidator.equals(
    "created todo deleted_at should be null or undefined",
    createdTodo.deleted_at ?? null,
    null,
  );

  // 4. Immediately call reopen on an already active todo.
  const reopenedTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.reopen(connection, {
      todoId: createdTodo.id,
    });
  typia.assert<ITodoAppTodo>(reopenedTodo);

  // 5. Validate idempotent behavior and lifecycle consistency.
  TestValidator.equals(
    "reopen should not create a new record; id must be identical",
    reopenedTodo.id,
    createdTodo.id,
  );

  TestValidator.equals(
    "reopened todo state remains active after idempotent reopen",
    reopenedTodo.state,
    "active",
  );

  TestValidator.equals(
    "reopened todo deleted_at remains null/undefined",
    reopenedTodo.deleted_at ?? null,
    null,
  );

  TestValidator.equals(
    "reopened todo completed_at remains null/undefined",
    reopenedTodo.completed_at ?? null,
    null,
  );

  TestValidator.equals(
    "reopened todo created_at must be unchanged",
    reopenedTodo.created_at,
    createdTodo.created_at,
  );

  const createdUpdatedAt = Date.parse(createdTodo.updated_at);
  const reopenedUpdatedAt = Date.parse(reopenedTodo.updated_at);

  TestValidator.predicate(
    "reopened todo updated_at should be greater than or equal to original updated_at",
    reopenedUpdatedAt >= createdUpdatedAt,
  );
}
