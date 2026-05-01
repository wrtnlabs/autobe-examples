import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppEditHistory";
import type { ITodoAppEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppEditHistory";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
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

/**
 * Test that viewing edit history of an unedited todo returns an empty list.
 *
 * Validates that when a member creates a todo without performing any edits and then retrieves its edit history, the response contains an empty data array with pagination metadata indicating zero total records and zero total pages. This confirms that a todo that has never been edited correctly returns an empty edit history list.
 *
 * 1. Member registers and authenticates via join.
 * 2. Member creates a new todo with title only.
 * 3. Member retrieves the edit history of the unedited todo.
 * 4. Validates that the edit history is empty with correct pagination metadata.
 */
export async function test_api_edit_history_view_empty_for_unedited_todo(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a new todo with title only
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(todo);
  // 3. Retrieve edit history of the unedited todo
  const history =
    await api.functional.todoApp.member.todos.edit_histories.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {} satisfies ITodoAppEditHistory.IRequest,
      },
    );
  typia.assert(history);
  // 4. Validate empty edit history
  TestValidator.equals("empty data array", history.data, []);
  TestValidator.equals("total records zero", history.pagination.records, 0);
  TestValidator.equals("total pages zero", history.pagination.pages, 0);
}
