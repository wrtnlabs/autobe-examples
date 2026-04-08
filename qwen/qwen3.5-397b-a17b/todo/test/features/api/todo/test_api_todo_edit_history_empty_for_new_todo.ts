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
 * Test edit history retrieval for a newly created todo with no edits.
 *
 * Validates the edge case where a member retrieves edit history for a todo that has just been created and never edited. This tests that the system correctly handles todos with zero edit history entries.
 *
 * The test creates a member account, authenticates, creates a new todo with all optional fields (title, description, start date, and due date), then immediately retrieves the edit history without performing any edit operations.
 *
 * 1. Member registers and authenticates with the system.
 * 2. Member creates a new todo with title, description, start date, and due date.
 * 3. Member retrieves edit history for the newly created todo.
 * 4. Validates that edit history is empty with correct pagination metadata.
 */
export async function test_api_todo_edit_history_empty_for_new_todo(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a new todo with all fields
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 86400000 * 7).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Retrieve edit history for the newly created todo
  const editHistoryResponse =
    await api.functional.todoApp.member.todos.edit_histories.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          page: 1,
          limit: 20,
          sort: "created_at DESC",
        } satisfies ITodoAppTodoEditHistory.IRequest,
      },
    );
  typia.assert(editHistoryResponse);
  // 4. Validate empty edit history with correct pagination
  TestValidator.equals("data array is empty", editHistoryResponse.data, []);
  TestValidator.equals(
    "records count is 0",
    editHistoryResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "current page is 1",
    editHistoryResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "total pages is 0",
    editHistoryResponse.pagination.pages,
    0,
  );
}
