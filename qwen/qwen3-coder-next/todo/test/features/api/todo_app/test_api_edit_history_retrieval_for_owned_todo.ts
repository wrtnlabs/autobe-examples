import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppEditHistoryEntry";
import type { ITodoAppEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppEditHistoryEntry";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
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

export async function test_api_edit_history_retrieval_for_owned_todo(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register and login as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberSession = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "testpass123",
    } satisfies ITodoAppMemberSession.IJoin,
  });
  typia.assert(memberSession);
  // Step 2: Create a todo item
  const todo = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: "Test Todo",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // Step 3: Edit todo title to create first edit history entry
  const updatedTodo1 = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        title: "Updated Title",
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo1);
  // Step 4: Edit todo description to create second edit history entry
  const updatedTodo2 = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        description: "Added description",
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo2);
  // Step 5: Retrieve edit history for the todo
  const history = await api.functional.todoApp.member.todos.history.at(
    memberConnection,
    {
      todoId: todo.id,
    },
  );
  typia.assert(history);
  // Step 6: Validate edit history
  TestValidator.equals("pagination current", history.pagination.current, 1);
  TestValidator.equals("pagination records", history.pagination.records, 2);
  TestValidator.equals("pagination pages", history.pagination.pages, 1);
  // Validate data array contains 2 entries
  TestValidator.equals("history count", history.data.length, 2);
  // Validate first entry (most recent - title change)
  const firstEntry = history.data[0];
  TestValidator.equals(
    "first entry title change",
    firstEntry.previous_title,
    "Test Todo",
  );
  TestValidator.equals(
    "first entry new title",
    firstEntry.new_title,
    "Updated Title",
  );
  TestValidator.equals(
    "first entry description unchanged",
    firstEntry.previous_description,
    null,
  );
  TestValidator.equals(
    "first entry new description",
    firstEntry.new_description,
    null,
  );
  TestValidator.predicate(
    "first entry has timestamp",
    firstEntry.created_at !== null,
  );
  // Validate second entry (description change)
  const secondEntry = history.data[1];
  TestValidator.equals(
    "second entry title unchanged",
    secondEntry.previous_title,
    null,
  );
  TestValidator.equals("second entry new title", secondEntry.new_title, null);
  TestValidator.equals(
    "second entry description change",
    secondEntry.previous_description,
    null,
  );
  TestValidator.equals(
    "second entry new description",
    secondEntry.new_description,
    "Added description",
  );
  TestValidator.predicate(
    "second entry has timestamp",
    secondEntry.created_at !== null,
  );
  // Validate sorting (most recent first)
  TestValidator.predicate(
    "entries sorted by timestamp (newest first)",
    new Date(firstEntry.created_at).getTime() >=
      new Date(secondEntry.created_at).getTime(),
  );
}
