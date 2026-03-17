import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoHistory";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_member_todos_create } from "../../../generate/generate_random_multi_user_todo_member_todos_create";
import { prepare_random_multi_user_todo_todo } from "../../../prepare/prepare_random_multi_user_todo_todo";

/**
 * Test the primary success case where an authenticated member retrieves a specific edit history entry for their own todo.
 *
 * Prerequisites sequence:
 * 1. Authenticate as a member via POST /multiUserTodo/auth/member/join
 * 2. Create a new todo via POST /multiUserTodo/member/todos with title "Test Todo"
 * 3. Update the todo via PUT /multiUserTodo/member/todos/{todoId} with new title "Updated Test Todo" to trigger history creation
 * 4. Retrieve the history list via PATCH /multiUserTodo/member/todos/{todoId}/histories to get the historyId
 *
 * Test execution:
 * - Call GET /multiUserTodo/member/todos/{todoId}/histories/{historyId} with the obtained historyId
 * - Verify response status is 200 OK
 * - Validate response body contains IMultiUserTodoHistory with correct fields:
 *   - id matches the requested historyId
 *   - todo contains ISummary of the parent todo
 *   - title reflects the updated value "Updated Test Todo"
 *   - description, startDate, dueDate, isCompleted reflect post-edit values
 *   - createdAt is a valid ISO 8601 timestamp
 * - Verify the history entry represents the state AFTER the edit operation
 */
export async function test_api_todo_history_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
    },
  });
  // 2. Create a new todo with title "Test Todo"
  const createdTodo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Test Todo",
      },
    },
  );
  typia.assert(createdTodo);
  // 3. Update the todo with new title "Updated Test Todo" to trigger history creation
  const updateBody = {
    title: "Updated Test Todo",
    description: null,
    start_date: null,
    due_date: null,
    is_complete: false,
  } satisfies IMultiUserTodoTodo.IUpdate;
  const updatedTodo = await api.functional.multiUserTodo.member.todos.update(
    memberConnection,
    {
      todoId: createdTodo.id,
      body: updateBody,
    },
  );
  typia.assert(updatedTodo);
  // Verify the todo was updated
  TestValidator.equals(
    "todo title updated",
    updatedTodo.title,
    "Updated Test Todo",
  );
  // 4. Retrieve the history list to get the historyId
  const historyList =
    await api.functional.multiUserTodo.member.todos.histories.index(
      memberConnection,
      {
        todoId: createdTodo.id,
        body: {},
      },
    );
  typia.assert(historyList);
  // Get the first history entry (most recent)
  const firstHistorySummary = historyList.data[0];
  // 5. Retrieve the specific history entry
  const historyDetail: IMultiUserTodoHistory =
    await api.functional.multiUserTodo.member.todos.histories.at(
      memberConnection,
      {
        todoId: createdTodo.id,
        historyId: firstHistorySummary.id,
      },
    );
  typia.assert(historyDetail);
  // Validate response fields
  TestValidator.equals(
    "history id matches",
    historyDetail.id,
    firstHistorySummary.id,
  );
  TestValidator.equals(
    "todo id matches",
    historyDetail.todo.id,
    createdTodo.id,
  );
  TestValidator.equals(
    "todo title in history",
    historyDetail.title,
    "Updated Test Todo",
  );
  TestValidator.equals(
    "history title matches summary title",
    historyDetail.title,
    firstHistorySummary.title,
  );
  // Validate todo summary fields
  TestValidator.equals(
    "todo summary title",
    historyDetail.todo.title,
    "Updated Test Todo",
  );
  // Validate that history createdAt is valid ISO 8601 (verified by typia.assert, just verify it's not null/undefined)
  typia.assertGuard<string & tags.Format<"date-time">>(historyDetail.createdAt);
  // Validate history fields reflect post-edit values
  TestValidator.equals("history description", historyDetail.description, null);
  TestValidator.equals("history startDate", historyDetail.startDate, null);
  TestValidator.equals("history dueDate", historyDetail.dueDate, null);
  TestValidator.equals("history isCompleted", historyDetail.isCompleted, false);
}
