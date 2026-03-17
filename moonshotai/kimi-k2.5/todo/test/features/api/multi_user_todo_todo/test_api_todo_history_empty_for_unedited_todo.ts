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
 * Test retrieving history for a todo that has not been edited since creation.
 *
 * This test verifies that:
 * 1. When a member creates a new todo, no history entries are initially created
 * 2. History entries are only generated when edit operations occur, not at creation
 * 3. The history endpoint returns an empty data array with proper pagination metadata
 *
 * Test flow:
 * - Create member connection and authenticate
 * - Create a todo with initial values
 * - Immediately fetch history without any edits
 * - Validate empty data array with zero records and pages
 */
export async function test_api_todo_history_empty_for_unedited_todo(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {},
  });
  // 2. Create a todo without any edits
  const todo: IMultiUserTodoTodo =
    await generate_random_multi_user_todo_member_todos_create(
      memberConnection,
      { body: {} },
    );
  typia.assert(todo);
  // 3. Fetch history immediately - should be empty since todo has not been edited
  const historyPage: IPageIMultiUserTodoHistory.ISummary =
    await api.functional.multiUserTodo.member.todos.histories.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {} satisfies IMultiUserTodoHistory.IRequest,
      },
    );
  typia.assert(historyPage);
  // 4. Validate pagination shows empty results
  TestValidator.equals(
    "pagination records is zero",
    historyPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages is zero",
    historyPage.pagination.pages,
    0,
  );
  TestValidator.equals("data array length is zero", historyPage.data.length, 0);
}
