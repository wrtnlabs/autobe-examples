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
 * Test todo history retrieval with multiple edits.
 *
 * This test validates the edit history retrieval functionality for todos.
 * Due to API limitations (no update endpoint provided), this test focuses on
 * validating the history retrieval endpoint structure and response format.
 *
 * Test Flow:
 * 1. Member registration and authentication
 * 2. Todo creation with initial data
 * 3. History retrieval and validation
 */
export async function test_api_todo_history_retrieval_with_multiple_edits(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
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
  // 2. Create a todo with complete initial data
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  TestValidator.equals("todo owner matches", todo.member.id, memberAuth.id);
  // 3. Retrieve edit history
  // Note: Without an update endpoint, history will be empty for newly created todo
  const historyResponse =
    await api.functional.todoApp.member.todos.histories.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          page: 1,
          limit: 20,
          sort: "created_at:desc",
        } satisfies ITodoAppTodoHistory.IRequest,
      },
    );
  typia.assert(historyResponse);
  // 4. Validate pagination metadata structure
  TestValidator.predicate(
    "current page is 1",
    historyResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit is 20",
    historyResponse.pagination.limit === 20,
  );
  TestValidator.predicate(
    "records count is non-negative",
    historyResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    historyResponse.pagination.pages >= 0,
  );
  // 5. Validate history data structure
  TestValidator.predicate("data is array", Array.isArray(historyResponse.data));
  // 6. Validate each history entry has at least one changed field (business logic validation)
  if (historyResponse.data.length > 0) {
    for (const entry of historyResponse.data) {
      // Validate that at least one field was changed in each history entry
      const hasChangedField =
        entry.new_title !== undefined ||
        entry.new_description !== undefined ||
        entry.new_start_date !== undefined ||
        entry.new_due_date !== undefined;
      TestValidator.predicate(
        "history entry has at least one changed field",
        hasChangedField,
      );
    }
    // 7. Validate reverse chronological order (most recent first)
    if (historyResponse.data.length > 1) {
      for (let i = 0; i < historyResponse.data.length - 1; i++) {
        const currentTime = new Date(
          historyResponse.data[i].created_at,
        ).getTime();
        const nextTime = new Date(
          historyResponse.data[i + 1].created_at,
        ).getTime();
        TestValidator.predicate(
          `history entry ${i} is newer than entry ${i + 1}`,
          currentTime >= nextTime,
        );
      }
    }
  }
}
