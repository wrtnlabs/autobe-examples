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
 * Test viewing edit history of a todo item.
 *
 * Validates the edit history retrieval workflow including member authentication, todo creation, and history endpoint access. Ensures that the history endpoint returns properly structured responses with pagination metadata, even when no edits have been performed.
 *
 * Special attention is given to verifying that the response structure is correct, pagination metadata is accurate, and the endpoint handles todos with no edit history gracefully.
 *
 * 1. Authenticate as a member using join utility function.
 * 2. Create a todo with initial title and description.
 * 3. Retrieve the edit history for the newly created todo.
 * 4. Verify the response contains empty history array (no edits yet).
 * 5. Verify pagination metadata is present and accurate for zero records.
 * 6. Verify response structure matches expected DTO types.
 */
export async function test_api_edit_history_view_with_multiple_edits(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: undefined,
  });
  typia.assert(member);
  // 2. Create a todo with initial title and description
  const initialTitle = RandomGenerator.paragraph({ sentences: 3 });
  const initialDescription = RandomGenerator.paragraph({ sentences: 5 });
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: initialTitle,
        description: initialDescription,
      },
    },
  );
  typia.assert(todo);
  // 3. Retrieve the edit history for the newly created todo
  const history =
    await api.functional.todoApp.member.todos.edit_histories.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {},
      },
    );
  typia.assert(history);
  // 4. Verify history contains empty array (no edits performed)
  TestValidator.equals("history entry count", history.data.length, 0);
  // 5. Verify pagination metadata for zero records
  TestValidator.equals("current page", history.pagination.current, 1);
  TestValidator.equals("total records", history.pagination.records, 0);
  TestValidator.equals("total pages", history.pagination.pages, 0);
  TestValidator.predicate("has valid limit", history.pagination.limit > 0);
  // 6. Verify response structure
  TestValidator.predicate("data is array", Array.isArray(history.data));
  TestValidator.predicate(
    "pagination object exists",
    history.pagination !== null && history.pagination !== undefined,
  );
  // 7. Verify todo ownership - the todo belongs to authenticated member
  TestValidator.equals(
    "todo belongs to authenticated member",
    todo.member.id,
    member.id,
  );
  // 8. Verify todo has expected initial values
  TestValidator.equals("todo title matches", todo.title, initialTitle);
  TestValidator.equals(
    "todo description matches",
    todo.description,
    initialDescription,
  );
  TestValidator.predicate("todo is incomplete", todo.completed === false);
  TestValidator.predicate("todo is active", todo.deleted_at === null);
}
