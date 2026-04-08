import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoEditHistory";
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
 * Test that a newly created todo has empty edit history with no entries.
 *
 * Validates the edge case where a todo exists but has never been modified. The test authenticates a member, creates a todo without any subsequent edits, and immediately retrieves its edit history to confirm the response contains an empty data array with zero pagination records.
 *
 * Special attention is given to verifying that the pagination metadata correctly reflects zero records and zero pages, and that the response structure remains valid even when no edit history exists.
 *
 * 1. Authenticate as a member using join utility function
 * 2. Create a new todo with minimal required fields (title only)
 * 3. Retrieve edit history for the newly created todo
 * 4. Verify the data array is empty (no history entries)
 * 5. Verify pagination shows records = 0 and pages = 0
 * 6. Verify response structure is valid with typia.assert
 */
export async function test_api_edit_history_empty_for_new_todo(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {},
  });
  // 2. Create a new todo without any edits
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(todo);
  // 3. Retrieve edit history for the newly created todo
  const history =
    await api.functional.todoApp.member.todos.edit_histories.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {},
      },
    );
  typia.assert(history);
  // 4. Verify the data array is empty (no history entries)
  TestValidator.equals("edit history data is empty", history.data.length, 0);
  // 5. Verify pagination shows records = 0 and pages = 0
  TestValidator.equals(
    "pagination records is zero",
    history.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages is zero", history.pagination.pages, 0);
  // 6. Verify current page is 1 (default)
  TestValidator.equals(
    "pagination current page is 1",
    history.pagination.current,
    1,
  );
}
