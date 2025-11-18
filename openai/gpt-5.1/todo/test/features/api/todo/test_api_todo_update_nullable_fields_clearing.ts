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

export async function test_api_todo_update_nullable_fields_clearing(
  connection: api.IConnection,
) {
  // 1. Admin bootstrap: join as admin and create a system setting
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todo-app.local/join",
    referrer: "https://admin.todo-app.local/",
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const systemSettingBody = {
    key: "todo_feature_enabled",
    value: "true",
    type: "boolean",
    description: "Enable todo creation and updates in memberUser area",
    group: "features",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const systemSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: systemSettingBody,
    });
  typia.assert(systemSetting);

  // 2. Member user bootstrap: join as member user
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12) as string & tags.Format<"password">,
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

  // 3. Create an initial todo with non-null description and due_date
  const initialTitle = RandomGenerator.paragraph({ sentences: 3 });
  const initialDescription = RandomGenerator.paragraph({ sentences: 5 });
  const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const createTodoBody = {
    title: initialTitle,
    description: initialDescription,
    due_date: dueDate,
    state: "active",
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: createTodoBody,
    });
  typia.assert(createdTodo);

  TestValidator.equals(
    "created todo should have given title",
    createdTodo.title,
    initialTitle,
  );
  TestValidator.equals(
    "created todo should have given description",
    createdTodo.description,
    initialDescription,
  );
  TestValidator.equals(
    "created todo should have given due_date",
    createdTodo.due_date,
    dueDate,
  );
  TestValidator.equals(
    "created todo state should be active",
    createdTodo.state,
    "active",
  );

  const originalUpdatedAt = createdTodo.updated_at;

  // 4. Clear nullable fields via update: set description and due_date explicitly to null
  const updateBody = {
    description: null,
    due_date: null,
  } satisfies ITodoAppTodo.IUpdate;

  const updatedTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.update(connection, {
      todoId: createdTodo.id,
      body: updateBody,
    });
  typia.assert(updatedTodo);

  // 5. Business validations
  TestValidator.equals(
    "title should remain unchanged after clearing nullable fields",
    updatedTodo.title,
    createdTodo.title,
  );
  TestValidator.equals(
    "state should remain unchanged after clearing nullable fields",
    updatedTodo.state,
    createdTodo.state,
  );
  TestValidator.equals(
    "description should be cleared to null",
    updatedTodo.description,
    null,
  );
  TestValidator.equals(
    "due_date should be cleared to null",
    updatedTodo.due_date,
    null,
  );
  TestValidator.notEquals(
    "updated_at should change after update",
    updatedTodo.updated_at,
    originalUpdatedAt,
  );
}
