import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoHistory";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistory";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_todo_app_user_todos_create } from "../../../generate/generate_random_todo_app_user_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

/**
 * Test viewing edit history for a newly created todo that has never been edited.
 *
 * This test verifies the edge case where a todo has no edit history because
 * history tracking only begins with the first edit operation. Todo creation
 * does not create a history entry.
 *
 * Validation Points:
 * 1. Empty data array - no history entries exist for newly created todo
 * 2. Valid pagination metadata with records=0 and pages=0
 * 3. Successful HTTP 200 response (not an error)
 */
export async function test_api_todo_history_empty_state(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate user via join
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {});
  // 2. Create a new todo with just the required title field
  const todo = await generate_random_todo_app_user_todos_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(todo);
  // 3. Retrieve history for the newly created todo
  const history = await api.functional.todoApp.user.todos.histories.index(
    userConnection,
    {
      todoId: todo.id,
      body: { limit: 20 },
    },
  );
  typia.assert(history);
  // 4. Validate empty history state
  TestValidator.equals("history data should be empty", history.data.length, 0);
  TestValidator.equals(
    "pagination records should be 0",
    history.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be 0",
    history.pagination.pages,
    0,
  );
}
