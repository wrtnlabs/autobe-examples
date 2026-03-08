import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_todo_app_member_todos_create } from "../../../generate/generate_random_todo_app_member_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

export async function test_api_todo_restore_from_trash_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: (typia.random<string>() as string & tags.Format<"uri">),
    } satisfies ITodoAppMember.IJoin,
  });
  // 2. Create todo with full metadata
  const todoCreate = {
    title: RandomGenerator.paragraph({ wordMin: 5, wordMax: 15 }),
    description: RandomGenerator.content({ paragraphs: 1, wordMin: 10, wordMax: 30 }),
    start_date: new Date().toISOString(),
    due_date: new Date(Date.now() + 86400000).toISOString(),
  } satisfies ITodoAppTodo.ICreate;
  const createdTodo = await api.functional.todoApp.member.todos.create(
    memberConnection,
    { body: todoCreate },
  );
  typia.assert(createdTodo);
  const createdTodoId = createdTodo.id;
  // Verify created todo has is_deleted: false and is_complete: false initially
  TestValidator.equals(
    "is_deleted should be false for newly created todo",
    createdTodo.is_deleted,
    false,
  );
  TestValidator.equals(
    "is_complete should be false for newly created todo",
    createdTodo.is_complete,
    false,
  );
  // 3. Mark todo as complete
  const todoWithCompletion = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: createdTodoId,
      body: { is_complete: true } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(todoWithCompletion);
  TestValidator.equals(
    "is_complete should be true after update",
    todoWithCompletion.is_complete,
    true,
  );
  const originalCreatedAt = todoWithCompletion.created_at;
  // 4. Soft delete the todo
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: createdTodoId,
  });
  // 5. Restore the todo
  const restoredTodo = await api.functional.todoApp.member.todos.restore(
    memberConnection,
    {
      todoId: createdTodoId,
    },
  );
  typia.assert(restoredTodo);
  // 6. Validate restored todo data integrity
  TestValidator.equals(
    "title should be preserved",
    restoredTodo.title,
    todoCreate.title,
  );
  TestValidator.equals(
    "description should be preserved",
    restoredTodo.description,
    todoCreate.description,
  );
  TestValidator.equals(
    "start_date should be preserved",
    restoredTodo.start_date,
    todoCreate.start_date,
  );
  TestValidator.equals(
    "due_date should be preserved",
    restoredTodo.due_date,
    todoCreate.due_date,
  );
  TestValidator.equals(
    "is_complete should be preserved",
    restoredTodo.is_complete,
    true,
  );
  TestValidator.equals(
    "created_at should remain unchanged",
    restoredTodo.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "is_deleted should be false after restore",
    restoredTodo.is_deleted,
    false,
  );
}