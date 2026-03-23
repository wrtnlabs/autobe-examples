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
 * Test that a member can retrieve an empty edit history for a newly created todo.
 * This validates the edge case where a todo has not yet been modified after creation.
 */
export async function test_api_todo_edit_history_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member user
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a new todo item without any edits
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {},
  );
  typia.assert(todo);
  // 3. Retrieve the edit history for the newly created todo
  const history =
    await api.functional.multiUserTodo.member.todos.edit_histories.editHistories(
      memberConnection,
      {
        todoId: todo.id,
      },
    );
  typia.assert(history);
  // 4. Verify that an empty array is returned (no history entries yet)
  TestValidator.equals("edit history is empty", history.data.length, 0);
  // 5. Verify the response structure has proper pagination metadata
  TestValidator.predicate(
    "pagination exists",
    history.pagination !== undefined,
  );
  TestValidator.equals("current page is 1", history.pagination.current, 1);
  TestValidator.predicate("limit is positive", history.pagination.limit > 0);
  TestValidator.equals("total records is 0", history.pagination.records, 0);
  TestValidator.equals("total pages is 0", history.pagination.pages, 0);
}
