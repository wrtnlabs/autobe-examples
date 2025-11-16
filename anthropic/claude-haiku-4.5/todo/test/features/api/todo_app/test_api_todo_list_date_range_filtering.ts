import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test filtering todos by creation date range using created_after and
 * created_before parameters.
 *
 * User creates todos at different time intervals, then searches for todos
 * created within a specific date range. Validates that the date filtering
 * correctly includes todos created within the specified range, excludes todos
 * outside the range, and properly handles boundary conditions. Demonstrates the
 * ability to retrieve todos from specific time periods.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a new user account
 * 2. Create multiple todos and record their actual creation timestamps
 * 3. Define date range boundaries based on actual todo timestamps
 * 4. Query todos within the date range using created_after and created_before
 *    filters
 * 5. Validate returned todos match the expected date range
 * 6. Test edge cases with only created_after or only created_before parameters
 * 7. Verify pagination and result counts are correct
 */
export async function test_api_todo_list_date_range_filtering(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a new user
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(user);

  // 2. Create multiple todos sequentially
  // Note: todos will be created with current server timestamps
  const todos: ITodoAppTodo[] = [];

  for (let i = 0; i < 5; i++) {
    const todo = await api.functional.todoApp.user.todos.create(connection, {
      body: {
        title: `Todo item ${i + 1}`,
        description: `Description for todo item ${i + 1}`,
      } satisfies ITodoAppTodo.ICreate,
    });
    typia.assert(todo);
    todos.push(todo);
  }

  // 3. Extract actual creation timestamps from the todos
  const createdAtValues = todos.map((t) => new Date(t.created_at));
  createdAtValues.sort((a, b) => a.getTime() - b.getTime());

  // 4. Define range boundaries based on actual timestamps
  // Range will include todos 1, 2, 3 (middle items)
  const rangeStart = createdAtValues[0];
  const rangeEnd = createdAtValues[createdAtValues.length - 1];
  const midpointTime = new Date(
    (rangeStart.getTime() + rangeEnd.getTime()) / 2,
  );

  // 5. Query todos with date range that captures middle todos
  const filteredResults: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        created_after: rangeStart.toISOString(),
        created_before: rangeEnd.toISOString(),
        page: 1,
        limit: 100,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(filteredResults);

  // 6. Validate that all returned todos have timestamps within the range
  for (const todo of filteredResults.data) {
    const todoCreatedAt = new Date(todo.created_at);
    TestValidator.predicate(
      `todo ${todo.id} created_at should be >= range start`,
      todoCreatedAt.getTime() >= rangeStart.getTime(),
    );
    TestValidator.predicate(
      `todo ${todo.id} created_at should be <= range end`,
      todoCreatedAt.getTime() <= rangeEnd.getTime(),
    );
  }

  // 7. Verify result count matches expected todos in range
  TestValidator.predicate(
    "filtered results should return todos within date range",
    filteredResults.data.length > 0,
  );
  TestValidator.predicate(
    "filtered results count should be <= total todos created",
    filteredResults.data.length <= todos.length,
  );

  // 8. Test with only created_after parameter
  const afterOnlyResults: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        created_after: midpointTime.toISOString(),
        page: 1,
        limit: 100,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(afterOnlyResults);

  // All returned todos should be after the midpoint
  for (const todo of afterOnlyResults.data) {
    const todoCreatedAt = new Date(todo.created_at);
    TestValidator.predicate(
      `todo ${todo.id} should be created after midpoint when using created_after filter`,
      todoCreatedAt.getTime() >= midpointTime.getTime(),
    );
  }

  // 9. Test with only created_before parameter
  const beforeOnlyResults: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        created_before: midpointTime.toISOString(),
        page: 1,
        limit: 100,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(beforeOnlyResults);

  // All returned todos should be before the midpoint
  for (const todo of beforeOnlyResults.data) {
    const todoCreatedAt = new Date(todo.created_at);
    TestValidator.predicate(
      `todo ${todo.id} should be created before midpoint when using created_before filter`,
      todoCreatedAt.getTime() <= midpointTime.getTime(),
    );
  }

  // 10. Test with neither date parameter (should return all todos)
  const allResults: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(allResults);
  TestValidator.equals(
    "results without date filters should include all created todos",
    allResults.pagination.records,
    todos.length,
  );

  // 11. Verify date filtering is exclusive (narrow range returns fewer results)
  const narrowRangeStart = new Date(rangeStart.getTime() + 1000); // 1 second after range start
  const narrowRangeEnd = new Date(rangeEnd.getTime() - 1000); // 1 second before range end
  const narrowResults: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        created_after: narrowRangeStart.toISOString(),
        created_before: narrowRangeEnd.toISOString(),
        page: 1,
        limit: 100,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(narrowResults);
  TestValidator.predicate(
    "narrow date range should return fewer or equal results than wide range",
    narrowResults.pagination.records <= filteredResults.pagination.records,
  );
}
