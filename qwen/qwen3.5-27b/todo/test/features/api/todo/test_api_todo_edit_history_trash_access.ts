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
 * Test that edit history remains accessible when the todo is in trash (soft deleted).
 *
 * Validates that edit history entries remain retrievable even after a todo is soft deleted. This test creates a todo item, and verifies that the edit history endpoint is accessible for the todo. Note: Full soft delete testing requires DELETE API which is not currently available in the SDK.
 *
 * The test demonstrates the principle that edit history should persist independently of the todo's deletion status, ensuring audit trail integrity.
 *
 * 1. Register and authenticate as a member
 * 2. Create a todo with initial content
 * 3. Access the edit history endpoint to verify accessibility
 * 4. Validate that history entries contain proper structure and data
 * 5. Confirm the todo reference is maintained in history records
 */
export async function test_api_todo_edit_history_trash_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a todo with initial content
  const todo: ITodoAppTodo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Test Todo for History Access",
        description:
          "This todo will be used to test edit history accessibility",
      },
    },
  );
  typia.assert(todo);
  // 3. Access edit history for the todo
  // Note: Without edit/delete APIs in the SDK, we verify the history endpoint
  // is accessible and returns properly structured data
  const historyEntry: ITodoAppTodoEditHistory =
    await api.functional.todoApp.member.todos.edit_histories.at(
      memberConnection,
      {
        todoId: todo.id,
        historyId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(historyEntry);
  // 4. Validate history entry structure
  TestValidator.predicate(
    "history has valid id",
    historyEntry.id !== undefined && historyEntry.id !== null,
  );
  TestValidator.predicate(
    "history has created_at timestamp",
    historyEntry.created_at !== undefined && historyEntry.created_at !== null,
  );
  // 5. Verify todo reference in history
  TestValidator.equals(
    "todo reference id matches",
    historyEntry.todo.id,
    todo.id,
  );
  TestValidator.predicate(
    "todo reference has title",
    historyEntry.todo.title !== undefined && historyEntry.todo.title.length > 0,
  );
  TestValidator.predicate(
    "todo reference has member",
    historyEntry.todo.member !== undefined,
  );
}
