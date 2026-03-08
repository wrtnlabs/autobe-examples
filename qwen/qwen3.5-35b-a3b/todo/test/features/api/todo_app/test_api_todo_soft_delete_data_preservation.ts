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

export async function test_api_todo_soft_delete_data_preservation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Create todo with specific data to test preservation
  const createData = {
    title: "Weekly Review",
    description: "Discuss project progress",
    start_date: new Date(Date.now() + 86400000).toISOString(),
    due_date: new Date(Date.now() + 86400000 * 7).toISOString(),
  } satisfies ITodoAppTodo.ICreate;
  const todo = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: createData,
    },
  );
  typia.assert(todo);
  TestValidator.equals("initial title matches", todo.title, createData.title);
  TestValidator.equals(
    "initial description matches",
    todo.description,
    createData.description,
  );
  // 3. First edit to create edit history entry
  const editedTodo1 = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        title: "Weekly Review - Updated",
        description: null,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(editedTodo1);
  TestValidator.equals(
    "title updated",
    editedTodo1.title,
    "Weekly Review - Updated",
  );
  TestValidator.equals("description cleared", editedTodo1.description, null);
  // Wait for timestamp difference to ensure history entries have different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 4. Second edit to create more edit history
  const editedTodo2 = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        title: "Weekly Review - Final",
        start_date: null,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(editedTodo2);
  TestValidator.equals(
    "final title",
    editedTodo2.title,
    "Weekly Review - Final",
  );
  TestValidator.equals("start_date cleared", editedTodo2.start_date, null);
  // 5. Soft delete todo
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todo.id,
  });
  // 6. Verify soft delete is reflected by checking that todo state changed
  // Note: After soft delete, the todo's is_deleted flag should be true and deleted_at should be set
  const deletedTodo = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {},
    },
  );
  typia.assert(deletedTodo);
  TestValidator.equals("is_deleted flag is true", deletedTodo.is_deleted, true);
  TestValidator.predicate(
    "deleted_at timestamp is set",
    deletedTodo.deleted_at !== null,
  );
  TestValidator.equals(
    "title preserved after deletion",
    deletedTodo.title,
    "Weekly Review - Final",
  );
  TestValidator.equals(
    "description preserved after deletion",
    deletedTodo.description,
    null,
  );
}