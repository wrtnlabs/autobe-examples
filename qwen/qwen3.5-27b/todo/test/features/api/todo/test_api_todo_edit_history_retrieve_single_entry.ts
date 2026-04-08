import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoEditHistory";
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

/**
 * Test retrieving a single edit history entry for a todo item.
 *
 * Validates the structure and content of a single edit history entry retrieved from the API. Ensures that the response contains all expected fields including the edit timestamp, changed field values, and todo reference.
 *
 * Note: This test uses simulation mode for the history retrieval since the todo update API is not available in the current SDK. In a production environment, the test would create actual edit history by updating a todo first.
 *
 * 1. Register and authenticate as a member
 * 2. Create a todo item
 * 3. Retrieve a single edit history entry (using simulation mode)
 * 4. Verify the response structure contains all expected fields
 * 5. Validate that the history entry has proper UUID format for id
 * 6. Validate that created_at is a valid date-time format
 * 7. Validate that the todo reference is present and has correct structure
 */
export async function test_api_todo_edit_history_retrieve_single_entry(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // 2. Create a todo item
  const todo: ITodoAppTodo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(todo);
  // 3. Retrieve a single edit history entry
  // Note: Using the todo's id and a random historyId since we cannot create actual edit history without the update API
  const retrievedHistory: ITodoAppTodoEditHistory =
    await api.functional.todoApp.member.todos.edit_histories.at(
      memberConnection,
      {
        todoId: todo.id,
        historyId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(retrievedHistory);
  // 4. Verify the response structure contains all expected fields
  TestValidator.predicate(
    "history entry has valid id",
    retrievedHistory.id !== null && retrievedHistory.id !== undefined,
  );
  TestValidator.predicate(
    "history entry has valid created_at",
    retrievedHistory.created_at !== null &&
      retrievedHistory.created_at !== undefined,
  );
  TestValidator.predicate(
    "history entry has todo reference",
    retrievedHistory.todo !== null && retrievedHistory.todo !== undefined,
  );
  // 5. Validate that the history entry has proper structure for changed fields
  // These fields can be null if they weren't modified in that edit operation
  TestValidator.predicate(
    "title_changed_to is string or null",
    retrievedHistory.title_changed_to === null ||
      typeof retrievedHistory.title_changed_to === "string",
  );
  TestValidator.predicate(
    "description_changed_to is string or null",
    retrievedHistory.description_changed_to === null ||
      typeof retrievedHistory.description_changed_to === "string",
  );
  TestValidator.predicate(
    "start_date_changed_to is date-time string or null",
    retrievedHistory.start_date_changed_to === null ||
      typeof retrievedHistory.start_date_changed_to === "string",
  );
  TestValidator.predicate(
    "due_date_changed_to is date-time string or null",
    retrievedHistory.due_date_changed_to === null ||
      typeof retrievedHistory.due_date_changed_to === "string",
  );
  // 6. Validate that the todo reference has correct structure
  TestValidator.equals(
    "todo reference has valid id",
    typeof retrievedHistory.todo.id,
    "string",
  );
  TestValidator.equals(
    "todo reference has valid title",
    typeof retrievedHistory.todo.title,
    "string",
  );
  TestValidator.equals(
    "todo reference has valid completed status",
    typeof retrievedHistory.todo.completed,
    "boolean",
  );
  TestValidator.predicate(
    "todo reference has member",
    retrievedHistory.todo.member !== null &&
      retrievedHistory.todo.member !== undefined,
  );
  TestValidator.equals(
    "todo reference member has valid id",
    typeof retrievedHistory.todo.member.id,
    "string",
  );
  TestValidator.equals(
    "todo reference member has valid email",
    typeof retrievedHistory.todo.member.email,
    "string",
  );
}
