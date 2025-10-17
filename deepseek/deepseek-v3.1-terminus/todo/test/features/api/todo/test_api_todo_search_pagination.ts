import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IMinimalTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMinimalTodoTodo";
import type { IMinimalTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMinimalTodoUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMinimalTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMinimalTodoTodo";

/**
 * Test the pagination functionality of the todo search endpoint.
 *
 * This test validates that the pagination system correctly handles page size,
 * navigation, and result metadata. It creates multiple todo items to ensure
 * substantial data for testing, then systematically tests different page
 * configurations to verify accurate record counts and pagination metadata.
 */
export async function test_api_todo_search_pagination(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as a user to access todo functionality
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const user: IMinimalTodoUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: "testpassword123",
      } satisfies IMinimalTodoUser.ICreate,
    });
  typia.assert(user);

  // Step 2: Create multiple todo items for pagination testing
  const todoCount = 15;
  const createdTodos: IMinimalTodoTodo[] = [];

  for (let i = 0; i < todoCount; i++) {
    const todo: IMinimalTodoTodo =
      await api.functional.minimalTodo.todos.create(connection, {
        body: {
          content: `Test todo item ${i + 1}: ${RandomGenerator.paragraph({ sentences: 2 })}`,
        } satisfies IMinimalTodoTodo.ICreate,
      });
    typia.assert(todo);
    createdTodos.push(todo);
  }

  // Step 3: Test pagination with different page sizes
  // Test page 1 with limit 5
  const page1: IPageIMinimalTodoTodo.ISummary =
    await api.functional.minimalTodo.todos.index(connection, {
      body: {
        page: 1,
        limit: 5,
      } satisfies IMinimalTodoTodo.IRequest,
    });
  typia.assert(page1);

  // Validate pagination metadata for page 1
  TestValidator.equals("page 1 should have 5 items", page1.data.length, 5);
  TestValidator.equals(
    "page 1 current page should be 1",
    page1.pagination.current,
    1,
  );
  TestValidator.equals("page 1 limit should be 5", page1.pagination.limit, 5);
  TestValidator.equals(
    "total records should match created todos",
    page1.pagination.records,
    todoCount,
  );
  TestValidator.equals(
    "total pages calculation should be correct",
    page1.pagination.pages,
    Math.ceil(todoCount / 5),
  );

  // Test page 2 with limit 5
  const page2: IPageIMinimalTodoTodo.ISummary =
    await api.functional.minimalTodo.todos.index(connection, {
      body: {
        page: 2,
        limit: 5,
      } satisfies IMinimalTodoTodo.IRequest,
    });
  typia.assert(page2);

  // Validate pagination metadata for page 2
  TestValidator.equals("page 2 should have 5 items", page2.data.length, 5);
  TestValidator.equals(
    "page 2 current page should be 2",
    page2.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit should be 5", page2.pagination.limit, 5);

  // Test page 3 with limit 5 (should have remaining items)
  const page3: IPageIMinimalTodoTodo.ISummary =
    await api.functional.minimalTodo.todos.index(connection, {
      body: {
        page: 3,
        limit: 5,
      } satisfies IMinimalTodoTodo.IRequest,
    });
  typia.assert(page3);

  // Validate pagination metadata for page 3
  const expectedPage3Items = todoCount - 10; // 15 total - 10 from first two pages
  TestValidator.equals(
    "page 3 should have remaining items",
    page3.data.length,
    expectedPage3Items,
  );
  TestValidator.equals(
    "page 3 current page should be 3",
    page3.pagination.current,
    3,
  );

  // Step 4: Test different limit values
  // Test with limit 10
  const largePage: IPageIMinimalTodoTodo.ISummary =
    await api.functional.minimalTodo.todos.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IMinimalTodoTodo.IRequest,
    });
  typia.assert(largePage);

  TestValidator.equals(
    "large page should have 10 items",
    largePage.data.length,
    10,
  );
  TestValidator.equals(
    "large page limit should be 10",
    largePage.pagination.limit,
    10,
  );
  TestValidator.equals(
    "large page should calculate correct total pages",
    largePage.pagination.pages,
    Math.ceil(todoCount / 10),
  );

  // Test with limit 3
  const smallPage: IPageIMinimalTodoTodo.ISummary =
    await api.functional.minimalTodo.todos.index(connection, {
      body: {
        page: 1,
        limit: 3,
      } satisfies IMinimalTodoTodo.IRequest,
    });
  typia.assert(smallPage);

  TestValidator.equals(
    "small page should have 3 items",
    smallPage.data.length,
    3,
  );
  TestValidator.equals(
    "small page limit should be 3",
    smallPage.pagination.limit,
    3,
  );
  TestValidator.equals(
    "small page should calculate correct total pages",
    smallPage.pagination.pages,
    Math.ceil(todoCount / 3),
  );

  // Step 5: Test default pagination (no parameters)
  const defaultPage: IPageIMinimalTodoTodo.ISummary =
    await api.functional.minimalTodo.todos.index(connection, {
      body: {} satisfies IMinimalTodoTodo.IRequest,
    });
  typia.assert(defaultPage);

  // Validate that default pagination returns a reasonable subset
  TestValidator.predicate(
    "default page should return some items",
    defaultPage.data.length > 0,
  );
  TestValidator.predicate(
    "default page should have valid pagination",
    defaultPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "default page should have valid limit",
    defaultPage.pagination.limit > 0,
  );

  // Step 6: Verify that todo items are correctly truncated in summary view
  page1.data.forEach((todoSummary, index) => {
    TestValidator.predicate(
      "todo summary content should be truncated",
      todoSummary.content.length <= 100,
    );
    TestValidator.equals(
      "todo summary should have id",
      typeof todoSummary.id,
      "string",
    );
    TestValidator.equals(
      "todo summary should have completed status",
      typeof todoSummary.completed,
      "boolean",
    );
    TestValidator.predicate(
      "todo summary should have creation date",
      todoSummary.created_at.length > 0,
    );
  });

  // Step 7: Test edge case - page beyond available data
  const beyondPage: IPageIMinimalTodoTodo.ISummary =
    await api.functional.minimalTodo.todos.index(connection, {
      body: {
        page: 100,
        limit: 5,
      } satisfies IMinimalTodoTodo.IRequest,
    });
  typia.assert(beyondPage);

  // Page beyond available data should return empty array but valid pagination
  TestValidator.equals(
    "page beyond data should return empty array",
    beyondPage.data.length,
    0,
  );
  TestValidator.equals(
    "page beyond data should have correct current page",
    beyondPage.pagination.current,
    100,
  );
  TestValidator.equals(
    "page beyond data should maintain correct total records",
    beyondPage.pagination.records,
    todoCount,
  );

  // Step 8: Test minimum page value
  const minPage: IPageIMinimalTodoTodo.ISummary =
    await api.functional.minimalTodo.todos.index(connection, {
      body: {
        page: 1,
        limit: 1,
      } satisfies IMinimalTodoTodo.IRequest,
    });
  typia.assert(minPage);

  TestValidator.predicate(
    "minimum page should return at least one item",
    minPage.data.length >= 0,
  );
  TestValidator.equals(
    "minimum page should have correct current page",
    minPage.pagination.current,
    1,
  );
}
