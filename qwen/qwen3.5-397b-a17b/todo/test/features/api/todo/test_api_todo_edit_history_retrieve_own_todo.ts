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
 * Test retrieving a specific edit history entry for a todo that the authenticated user owns.
 *
 * Validates the complete edit history retrieval flow including member authentication, todo creation, todo editing which generates history entries, and retrieving a specific history entry by its ID. Ensures that the history entry correctly captures the changed field values and maintains proper association with the parent todo.
 *
 * Special attention is given to verifying that the edit history entry contains the updated title and description values (non-null since these fields were changed), while startedAt and dueAt remain null (since those fields were not modified in this edit). The history entry's todo reference is also validated to ensure it matches the parent todo.
 *
 * 1. Member registers with email, password, and display name.
 * 2. Member creates a todo with title, description, start date, and due date.
 * 3. Member edits the todo's title and description, which automatically creates an edit history entry.
 * 4. Extract the history entry ID from the update response's editHistories array.
 * 5. Retrieve the specific edit history entry by todoId and historyId.
 * 6. Validate the history entry contains correct changed values and todo reference.
 */
export async function test_api_todo_edit_history_retrieve_own_todo(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  // Set authorization header from the returned token
  memberConnection.headers = {
    Authorization: `Bearer ${member.token.access}`,
  };
  // 2. Create a todo with all fields
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Edit the todo's title and description (creates edit history entry)
  const newTitle = RandomGenerator.paragraph({ sentences: 3 });
  const newDescription = RandomGenerator.content({ paragraphs: 3 });
  const updatedTodo = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        title: newTitle,
        description: newDescription,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);
  // 4. Extract the history entry ID from the update response
  // The update should have created at least one edit history entry
  TestValidator.predicate(
    "edit history created",
    updatedTodo.editHistories.length > 0,
  );
  const historyEntry = updatedTodo.editHistories[0];
  const historyId = historyEntry.id;
  // 5. Retrieve the specific edit history entry
  const retrievedHistory =
    await api.functional.todoApp.member.todos.edit_histories.at(
      memberConnection,
      {
        todoId: todo.id,
        historyId: historyId,
      },
    );
  typia.assert(retrievedHistory);
  // 6. Validate the history entry contains correct changed values
  TestValidator.equals("history id matches", retrievedHistory.id, historyId);
  TestValidator.equals("title was changed", retrievedHistory.title, newTitle);
  TestValidator.equals(
    "description was changed",
    retrievedHistory.description,
    newDescription,
  );
  // startedAt and dueAt should be null since we didn't change those fields
  TestValidator.equals(
    "start date not changed",
    retrievedHistory.startedAt,
    null,
  );
  TestValidator.equals("due date not changed", retrievedHistory.dueAt, null);
  // 7. Verify the history entry's todo reference matches the parent todo
  TestValidator.equals("todo id matches", retrievedHistory.todo.id, todo.id);
  TestValidator.equals(
    "todo title matches",
    retrievedHistory.todo.title,
    updatedTodo.title,
  );
  TestValidator.equals(
    "todo is_completed matches",
    retrievedHistory.todo.is_completed,
    updatedTodo.isCompleted,
  );
  // 8. Verify timestamp is recent (within test execution timeframe)
  TestValidator.predicate(
    "createdAt is recent",
    new Date(retrievedHistory.createdAt).getTime() > Date.now() - 60000,
  );
}
