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
 * Test retrieving a non-existent edit history entry returns 404 Not Found.
 *
 * Validates that the edit history retrieval endpoint properly handles requests for history entries that do not exist. Tests two scenarios: requesting a non-existent history ID for a valid todo, and requesting a history entry for a non-existent todo.
 *
 * The test ensures that the system returns appropriate 404 Not Found errors in both cases, confirming proper error handling for missing resources.
 *
 * 1. Register and authenticate as a member
 * 2. Create a todo item without editing it (no edit history exists)
 * 3. Attempt to retrieve edit history with valid todoId but non-existent historyId
 * 4. Verify 404 Not Found error is returned
 * 5. Attempt to retrieve edit history with non-existent todoId
 * 6. Verify 404 Not Found error is returned for non-existent todo
 */
export async function test_api_todo_edit_history_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a todo item without editing it (so no edit history exists)
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {},
  );
  typia.assert(todo);
  // 3. Attempt to retrieve edit history with valid todoId but non-existent historyId
  const nonExistentHistoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "returns 404 for non-existent historyId",
    404,
    async () =>
      await api.functional.todoApp.member.todos.edit_histories.at(
        memberConnection,
        {
          todoId: todo.id,
          historyId: nonExistentHistoryId,
        },
      ),
  );
  // 4. Attempt to retrieve edit history with non-existent todoId
  const nonExistentTodoId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "returns 404 for non-existent todoId",
    404,
    async () =>
      await api.functional.todoApp.member.todos.edit_histories.at(
        memberConnection,
        {
          todoId: nonExistentTodoId,
          historyId: typia.random<string & tags.Format<"uuid">>(),
        },
      ),
  );
}
