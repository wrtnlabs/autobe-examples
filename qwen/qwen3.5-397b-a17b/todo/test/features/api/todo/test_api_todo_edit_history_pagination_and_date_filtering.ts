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
 * Test pagination and date range filtering for todo edit history retrieval.
 *
 * Validates the complete edit history retrieval flow including member authentication, todo creation, and edit history pagination with date filtering. Ensures that pagination parameters correctly limit results, date range filters properly exclude entries outside the specified range, and sort orders work as expected.
 *
 * Special attention is given to verifying that pagination metadata accurately reflects the filtered result set and that combining date filters with pagination produces correct results. The test validates both ascending and descending sort orders on created_at timestamps.
 *
 * 1. Member registers and authenticates with unique credentials.
 * 2. Member creates a todo item that will have edit history.
 * 3. Member retrieves edit history with default pagination (page 1, limit 20).
 * 4. Validates pagination metadata structure and data array.
 * 5. Tests pagination with custom limit (5 items per page).
 * 6. Tests date range filtering with from parameter.
 * 7. Tests date range filtering with to parameter.
 * 8. Tests combined from and to date filtering.
 * 9. Tests sort order ascending (created_at).
 * 10. Tests sort order descending (created_at DESC).
 * 11. Validates that date filtering combined with pagination works correctly.
 */
export async function test_api_todo_edit_history_pagination_and_date_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a todo
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Retrieve edit history with default pagination
  const defaultHistory =
    await api.functional.todoApp.member.todos.edit_histories.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {} satisfies ITodoAppTodoEditHistory.IRequest,
      },
    );
  typia.assert(defaultHistory);
  // 4. Validate pagination metadata structure
  TestValidator.predicate(
    "pagination has current page",
    defaultHistory.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    defaultHistory.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination has records count",
    defaultHistory.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    defaultHistory.pagination.pages >= 0,
  );
  TestValidator.predicate("data is array", Array.isArray(defaultHistory.data));
  // 5. Test pagination with custom limit
  const limitedHistory =
    await api.functional.todoApp.member.todos.edit_histories.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies ITodoAppTodoEditHistory.IRequest,
      },
    );
  typia.assert(limitedHistory);
  TestValidator.equals("limit respected", limitedHistory.pagination.limit, 5);
  TestValidator.predicate(
    "data length within limit",
    limitedHistory.data.length <= 5,
  );
  // 6. Test pagination page 2
  const page2History =
    await api.functional.todoApp.member.todos.edit_histories.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          page: 2,
          limit: 5,
        } satisfies ITodoAppTodoEditHistory.IRequest,
      },
    );
  typia.assert(page2History);
  TestValidator.equals("page 2 current", page2History.pagination.current, 2);
  // 7. Test date range filtering with from parameter
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 1000 * 60 * 60);
  const fromFilteredHistory =
    await api.functional.todoApp.member.todos.edit_histories.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          from: oneHourAgo.toISOString(),
        } satisfies ITodoAppTodoEditHistory.IRequest,
      },
    );
  typia.assert(fromFilteredHistory);
  // All entries should be created after oneHourAgo
  for (const entry of fromFilteredHistory.data) {
    TestValidator.predicate(
      "entry after from date",
      new Date(entry.created_at) >= oneHourAgo,
    );
  }
  // 8. Test date range filtering with to parameter
  const toFilteredHistory =
    await api.functional.todoApp.member.todos.edit_histories.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          to: now.toISOString(),
        } satisfies ITodoAppTodoEditHistory.IRequest,
      },
    );
  typia.assert(toFilteredHistory);
  // All entries should be created before now
  for (const entry of toFilteredHistory.data) {
    TestValidator.predicate(
      "entry before to date",
      new Date(entry.created_at) <= now,
    );
  }
  // 9. Test combined from and to date filtering
  const twoHoursAgo = new Date(now.getTime() - 1000 * 60 * 60 * 2);
  const rangeFilteredHistory =
    await api.functional.todoApp.member.todos.edit_histories.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          from: twoHoursAgo.toISOString(),
          to: now.toISOString(),
        } satisfies ITodoAppTodoEditHistory.IRequest,
      },
    );
  typia.assert(rangeFilteredHistory);
  // All entries should be within the range
  for (const entry of rangeFilteredHistory.data) {
    TestValidator.predicate(
      "entry within date range",
      new Date(entry.created_at) >= twoHoursAgo &&
        new Date(entry.created_at) <= now,
    );
  }
  // 10. Test sort order ascending (oldest first)
  const ascHistory =
    await api.functional.todoApp.member.todos.edit_histories.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          sort: "created_at",
        } satisfies ITodoAppTodoEditHistory.IRequest,
      },
    );
  typia.assert(ascHistory);
  // Verify ascending order
  for (let i = 1; i < ascHistory.data.length; i++) {
    TestValidator.predicate(
      "ascending order",
      new Date(ascHistory.data[i - 1].created_at) <=
        new Date(ascHistory.data[i].created_at),
    );
  }
  // 11. Test sort order descending (newest first)
  const descHistory =
    await api.functional.todoApp.member.todos.edit_histories.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          sort: "created_at DESC",
        } satisfies ITodoAppTodoEditHistory.IRequest,
      },
    );
  typia.assert(descHistory);
  // Verify descending order
  for (let i = 1; i < descHistory.data.length; i++) {
    TestValidator.predicate(
      "descending order",
      new Date(descHistory.data[i - 1].created_at) >=
        new Date(descHistory.data[i].created_at),
    );
  }
  // 12. Test date filtering combined with pagination
  const combinedHistory =
    await api.functional.todoApp.member.todos.edit_histories.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          page: 1,
          limit: 10,
          from: twoHoursAgo.toISOString(),
          to: now.toISOString(),
          sort: "created_at DESC",
        } satisfies ITodoAppTodoEditHistory.IRequest,
      },
    );
  typia.assert(combinedHistory);
  TestValidator.equals(
    "combined pagination limit",
    combinedHistory.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "combined data within limit",
    combinedHistory.data.length <= 10,
  );
  // Verify all entries are within date range
  for (const entry of combinedHistory.data) {
    TestValidator.predicate(
      "combined entry within range",
      new Date(entry.created_at) >= twoHoursAgo &&
        new Date(entry.created_at) <= now,
    );
  }
}
