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
 * Test pagination behavior with various page sizes and limits.
 *
 * Creates sufficient todo items to require multiple pages, then tests
 * pagination with different limit values (including maximum limit of 100).
 * Validates that pagination metadata is correct and page navigation works as
 * expected.
 */
export async function test_api_todo_search_pagination_limits(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "password123",
      name: RandomGenerator.name(),
      href: "https://example.com",
      referrer: "https://example.com/referrer",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create large number of todo items for pagination testing
  const todoCount = 150; // More than maximum page limit to test pagination
  const createdTodos: ITodoAppTodo[] = [];

  for (let i = 0; i < todoCount; i++) {
    const todo = await api.functional.todoApp.user.todos.create(connection, {
      body: {
        text: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 8,
        }),
        completed: i % 3 === 0, // Mix completed and incomplete todos
      } satisfies ITodoAppTodo.ICreate,
    });
    typia.assert(todo);
    createdTodos.push(todo);
  }

  // Step 3: Test pagination with default limit (no limit specified)
  const defaultPage = await api.functional.todoApp.user.todos.index(
    connection,
    {
      body: {
        page: 1,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(defaultPage);

  TestValidator.predicate(
    "default page should return todos",
    defaultPage.data.length > 0,
  );
  TestValidator.predicate(
    "default page should have valid pagination",
    defaultPage.pagination.records >= todoCount,
  );

  // Step 4: Test pagination with maximum limit of 100
  const maxLimitPage = await api.functional.todoApp.user.todos.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(maxLimitPage);

  TestValidator.equals(
    "maximum limit page should have correct item count",
    maxLimitPage.data.length,
    100,
  );
  TestValidator.equals(
    "maximum limit should be respected",
    maxLimitPage.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "total records should match created todos",
    maxLimitPage.pagination.records >= todoCount,
  );

  // Step 5: Test pagination with smaller limits
  const testLimits = [10, 25, 50] as const;

  for (const limit of testLimits) {
    const limitedPage = await api.functional.todoApp.user.todos.index(
      connection,
      {
        body: {
          page: 1,
          limit: limit,
        } satisfies ITodoAppTodo.IRequest,
      },
    );
    typia.assert(limitedPage);

    TestValidator.equals(
      `limit ${limit} should be respected`,
      limitedPage.data.length,
      limit,
    );
    TestValidator.equals(
      `pagination limit should match requested ${limit}`,
      limitedPage.pagination.limit,
      limit,
    );
  }

  // Step 6: Test page navigation
  const firstPage = await api.functional.todoApp.user.todos.index(connection, {
    body: {
      page: 1,
      limit: 25,
    } satisfies ITodoAppTodo.IRequest,
  });
  typia.assert(firstPage);

  const secondPage = await api.functional.todoApp.user.todos.index(connection, {
    body: {
      page: 2,
      limit: 25,
    } satisfies ITodoAppTodo.IRequest,
  });
  typia.assert(secondPage);

  TestValidator.notEquals(
    "first and second page should have different data",
    firstPage.data,
    secondPage.data,
  );
  TestValidator.predicate(
    "pagination metadata should be consistent",
    firstPage.pagination.records === secondPage.pagination.records &&
      firstPage.pagination.limit === secondPage.pagination.limit,
  );

  // Step 7: Test pagination metadata calculations
  const testPage = await api.functional.todoApp.user.todos.index(connection, {
    body: {
      page: 1,
      limit: 30,
    } satisfies ITodoAppTodo.IRequest,
  });
  typia.assert(testPage);

  const expectedPages = Math.ceil(testPage.pagination.records / 30);
  TestValidator.equals(
    "total pages calculation should be correct",
    testPage.pagination.pages,
    expectedPages,
  );
  TestValidator.equals(
    "current page should be correct",
    testPage.pagination.current,
    1,
  );

  // Step 8: Test edge case - request page beyond total pages
  const lastPage = await api.functional.todoApp.user.todos.index(connection, {
    body: {
      page: testPage.pagination.pages + 1, // Request page beyond total
      limit: 30,
    } satisfies ITodoAppTodo.IRequest,
  });
  typia.assert(lastPage);

  TestValidator.predicate(
    "requesting page beyond total should return empty data",
    lastPage.data.length === 0,
  );
  TestValidator.equals(
    "current page should reflect requested page even if empty",
    lastPage.pagination.current,
    testPage.pagination.pages + 1,
  );
}
