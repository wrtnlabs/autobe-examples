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
 * Test that a todo which has never been edited since creation returns an empty edit history list.
 *
 * Validates the business rule that requesting edit history for a never-modified todo returns an empty paginated list with zero records, rather than treating it as an error condition (404 or 4xx).
 *
 * 1. Join as a new member using randomized credentials via `authorize_member_join`.
 * 2. Create a todo with a simple title via `generate_random_todo_app_member_todos_create` (no subsequent edits).
 * 3. Retrieve the edit history for that todo via `api.functional.todoApp.member.todos.edit_histories.index`.
 * 4. Validate the response: data array is empty, pagination shows `records === 0` and `pages === 0`.
 */
export async function test_api_edit_history_empty_for_never_edited_todo(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: "https://example.com/join",
      referrer: "https://example.com/",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  // 2. Create a todo with a simple title (no subsequent edits)
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Never Edited Todo",
      },
    },
  );
  typia.assert(todo);
  // 3. Retrieve edit history for the never-edited todo
  const editHistory =
    await api.functional.todoApp.member.todos.edit_histories.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies ITodoAppEditHistory.IRequest,
      },
    );
  typia.assert(editHistory);
  // 4. Validate that edit history is empty
  TestValidator.equals("edit history data is empty", editHistory.data, []);
  TestValidator.equals(
    "pagination records is 0",
    editHistory.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages is 0",
    editHistory.pagination.pages,
    0,
  );
}
