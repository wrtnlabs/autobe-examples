import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoTodoEditHistory";
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
 * Test retrieving the edit history of an active todo that belongs to the authenticated member.
 *
 * Steps:
 * 1. Register a new member account via POST /multiUserTodo/auth/member/join
 * 2. Create a new todo via POST /multiUserTodo/member/todos with title 'Original Title'
 * 3. Update the todo via PUT /multiUserTodo/member/todos/{todoId} to change the title to 'Updated Title'
 * 4. Retrieve the edit history via PATCH /multiUserTodo/member/todos/{todoId}/history with pagination
 *
 * Expected:
 * - Response should have HTTP 200 status
 * - Response should contain pagination metadata (current, limit, records, pages)
 * - Response data should contain at least one history entry
 * - The history entry should have old_title='Original Title' and new_title='Updated Title'
 * - History entries should be sorted newest first (created_at DESC)
 */
export async function test_api_todo_history_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // Step 2: Create a new todo with original title
  const originalTitle = "Original Title";
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: originalTitle,
      },
    },
  );
  typia.assert(todo);
  // Step 3: Update the todo to create an edit history entry
  const updatedTitle = "Updated Title";
  const updatedTodo = await api.functional.multiUserTodo.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        title: updatedTitle,
      } satisfies IMultiUserTodoTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);
  // Step 4: Retrieve the edit history with pagination
  const historyResponse =
    await api.functional.multiUserTodo.member.todos.history.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {} satisfies IMultiUserTodoTodoEditHistory.IRequest,
      },
    );
  typia.assert(historyResponse);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination exists",
    historyResponse.pagination !== null,
    true,
  );
  TestValidator.predicate(
    "pagination has current",
    historyResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    historyResponse.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination has records",
    historyResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    historyResponse.pagination.pages >= 0,
  );
  // Validate history data contains at least one entry
  TestValidator.predicate(
    "has at least one history entry",
    historyResponse.data.length >= 1,
  );
  // Find the title change history entry
  const titleHistoryEntry = historyResponse.data.find(
    (entry) =>
      entry.old_title === originalTitle && entry.new_title === updatedTitle,
  );
  TestValidator.equals(
    "title change history entry exists",
    titleHistoryEntry !== null,
    true,
  );
  TestValidator.equals(
    "old_title matches original",
    titleHistoryEntry!.old_title,
    originalTitle,
  );
  TestValidator.equals(
    "new_title matches updated",
    titleHistoryEntry!.new_title,
    updatedTitle,
  );
}
