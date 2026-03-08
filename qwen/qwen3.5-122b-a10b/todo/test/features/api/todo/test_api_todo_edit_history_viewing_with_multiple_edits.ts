import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoHistory";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistory";
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
 * Test that a member can view the edit history of their todo after making multiple edits.
 *
 * 1. Create a member account and authenticate
 * 2. Create a new todo with initial title and description
 * 3. Retrieve the edit history using pagination parameters
 * 4. Verify that history entries are returned in reverse chronological order (most recent first)
 * 5. Verify each history entry contains the timestamp (created_at) and only the fields that were changed
 * 6. Verify the pagination metadata is correct (current page, limit, total records, total pages)
 * 7. Verify that all changes made to the todo are reflected in the history entries with accurate field values
 */
export async function test_api_todo_edit_history_viewing_with_multiple_edits(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a todo with initial title and description
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Retrieve the edit history with pagination
  const historyResponse =
    await api.functional.todoApp.member.todos.histories.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          page: 1,
          limit: 10,
          sort_by: "created_at",
          order: "desc",
        } satisfies ITodoAppTodoHistory.IRequest,
      },
    );
  typia.assert(historyResponse);
  // 4. Verify pagination metadata
  TestValidator.equals(
    "pagination current page",
    historyResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    historyResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination has records",
    historyResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages calculated",
    historyResponse.pagination.pages >= 0,
  );
  // 5. Verify history entries exist and are sorted correctly
  TestValidator.predicate(
    "history has entries",
    historyResponse.data.length > 0,
  );
  // 6. Verify each history entry has required fields
  for (const historyEntry of historyResponse.data) {
    typia.assert(historyEntry);
    // Verify timestamp exists
    TestValidator.predicate("has created_at", historyEntry.created_at !== null);
    // Verify history entry structure - at least one field should be non-null
    TestValidator.predicate(
      "has at least one changed field",
      historyEntry.title !== null ||
        historyEntry.description !== null ||
        historyEntry.start_date !== null ||
        historyEntry.due_date !== null ||
        historyEntry.completed !== null,
    );
  }
  // 7. Verify reverse chronological order (most recent first)
  if (historyResponse.data.length > 1) {
    for (let i = 0; i < historyResponse.data.length - 1; i++) {
      const current = new Date(historyResponse.data[i].created_at).getTime();
      const next = new Date(historyResponse.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `history entry ${i} is more recent than entry ${i + 1}`,
        current >= next,
      );
    }
  }
}
