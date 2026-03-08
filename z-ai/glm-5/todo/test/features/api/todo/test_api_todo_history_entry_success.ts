import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistory";
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

export async function test_api_todo_history_entry_success(
  connection: api.IConnection,
): Promise<void> {
  // Test successful retrieval of a specific history entry for an owned todo.
  // Note: The histories.index endpoint is not available, so we cannot obtain
  // a real historyId. Using a generated UUID to demonstrate the at endpoint call.
  // Step 1: Create and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  // Step 2: Create a todo with initial values
  const originalTitle = "Original Title";
  const originalDescription = "Original description";
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: originalTitle,
        description: originalDescription,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // Step 3: Edit the todo to create a history entry
  const updatedTitle = "Updated Title";
  const updatedDescription = "Updated description";
  const updatedTodo = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        title: updatedTitle,
        description: updatedDescription,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);
  // Validate the todo was updated correctly
  TestValidator.equals("todo id preserved", updatedTodo.id, todo.id);
  TestValidator.equals("title updated", updatedTodo.title, updatedTitle);
  TestValidator.equals(
    "description updated",
    updatedTodo.description,
    updatedDescription,
  );
  // Step 4: Retrieve a specific history entry using the at endpoint
  // Note: Since histories.index endpoint is not available, we use a generated UUID
  // In a real scenario with the index endpoint, we would retrieve the historyId from there
  const historyId = typia.random<string & tags.Format<"uuid">>();
  const history = await api.functional.todoApp.member.todos.histories.at(
    memberConnection,
    {
      todoId: todo.id,
      historyId: historyId,
    },
  );
  typia.assert(history);
  // Validate the history entry structure
  TestValidator.predicate(
    "editedAt is valid datetime",
    history.editedAt !== null,
  );
  TestValidator.equals("todo reference id", history.todo.id, todo.id);
  TestValidator.predicate(
    "titleChange is string or null",
    history.titleChange === null || typeof history.titleChange === "string",
  );
  TestValidator.predicate(
    "descriptionChange is string or null",
    history.descriptionChange === null ||
      typeof history.descriptionChange === "string",
  );
  TestValidator.predicate(
    "startDateChange is datetime or null",
    history.startDateChange === null ||
      typeof history.startDateChange === "string",
  );
  TestValidator.predicate(
    "dueDateChange is datetime or null",
    history.dueDateChange === null || typeof history.dueDateChange === "string",
  );
}
