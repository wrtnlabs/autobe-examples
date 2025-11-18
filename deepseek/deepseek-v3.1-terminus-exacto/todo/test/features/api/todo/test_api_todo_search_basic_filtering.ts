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
 * Test basic todo search functionality with various filtering options.
 *
 * This test validates the search API endpoint by creating multiple todo items
 * with different completion statuses and text content, then testing search
 * functionality with various criteria including text search, completion status
 * filtering, pagination, and sorting. The test ensures that search results
 * match the filter criteria and all search features work correctly.
 */
export async function test_api_todo_search_basic_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "TestPassword123!";

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      name: RandomGenerator.name(),
      href: "https://example.com/todo-app",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create multiple todo items with varied content
  const todoTexts = [
    "Buy groceries for the week",
    "Finish project documentation",
    "Call the dentist for appointment",
    "Review meeting notes from yesterday",
    "Plan weekend activities with family",
    "Complete coding assignment",
    "Organize workspace and clean desk",
    "Read new book chapter",
  ] as const;

  const createdTodos: ITodoAppTodo[] = [];

  // Create todos with alternating completion status
  for (let i = 0; i < todoTexts.length; i++) {
    const todo = await api.functional.todoApp.user.todos.create(connection, {
      body: {
        text: todoTexts[i],
        completed: i % 2 === 0, // Alternate between completed and incomplete
      } satisfies ITodoAppTodo.ICreate,
    });
    typia.assert(todo);
    createdTodos.push(todo);
  }

  // Step 3: Test basic search functionality
  // Test 3.1: Search for todos containing specific text
  const searchResults = await api.functional.todoApp.user.todos.index(
    connection,
    {
      body: {
        search: "groceries",
        limit: 10,
        page: 1,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(searchResults);

  TestValidator.equals(
    "search should return todos containing search term",
    searchResults.data.length,
    1,
  );
  TestValidator.predicate(
    "found todo should contain search term",
    searchResults.data[0].text.includes("groceries"),
  );

  // Test 3.2: Filter by completed status
  const completedResults = await api.functional.todoApp.user.todos.index(
    connection,
    {
      body: {
        completed: true,
        limit: 10,
        page: 1,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(completedResults);

  TestValidator.predicate(
    "all returned todos should be completed",
    completedResults.data.every((todo) => todo.completed === true),
  );

  // Test 3.3: Filter by incomplete status
  const incompleteResults = await api.functional.todoApp.user.todos.index(
    connection,
    {
      body: {
        completed: false,
        limit: 10,
        page: 1,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(incompleteResults);

  TestValidator.predicate(
    "all returned todos should be incomplete",
    incompleteResults.data.every((todo) => todo.completed === false),
  );

  // Test 3.4: Test pagination with multiple pages
  const page1Results = await api.functional.todoApp.user.todos.index(
    connection,
    {
      body: {
        limit: 3,
        page: 1,
        sort_by: "created_at",
        order: "asc",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(page1Results);

  TestValidator.equals(
    "page 1 should return correct number of items",
    page1Results.data.length,
    3,
  );

  const page2Results = await api.functional.todoApp.user.todos.index(
    connection,
    {
      body: {
        limit: 3,
        page: 2,
        sort_by: "created_at",
        order: "asc",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(page2Results);

  TestValidator.equals(
    "page 2 should return correct number of items",
    page2Results.data.length,
    3,
  );

  TestValidator.notEquals(
    "page 1 and page 2 should have different data",
    page1Results.data.map((t) => t.id),
    page2Results.data.map((t) => t.id),
  );

  // Test 3.5: Search with multiple criteria
  const complexSearch = await api.functional.todoApp.user.todos.index(
    connection,
    {
      body: {
        search: "project",
        completed: true,
        limit: 5,
        page: 1,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(complexSearch);

  TestValidator.predicate(
    "complex search should return matching completed todos",
    complexSearch.data.every(
      (todo) => todo.text.includes("project") && todo.completed === true,
    ),
  );

  // Test 3.6: Test partial text matching
  const partialSearch = await api.functional.todoApp.user.todos.index(
    connection,
    {
      body: {
        search: "ing",
        limit: 10,
        page: 1,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(partialSearch);

  TestValidator.predicate(
    "partial search should return todos containing the substring",
    partialSearch.data.every((todo) => todo.text.toLowerCase().includes("ing")),
  );

  // Test 3.7: Test sorting by different fields
  const sortedByText = await api.functional.todoApp.user.todos.index(
    connection,
    {
      body: {
        sort_by: "text",
        order: "asc",
        limit: 10,
        page: 1,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(sortedByText);

  TestValidator.predicate(
    "todos should be sorted alphabetically by text",
    sortedByText.data.length > 1
      ? sortedByText.data[0].text.localeCompare(sortedByText.data[1].text) <= 0
      : true,
  );

  // Test 3.8: Verify total record count matches created todos
  const allResults = await api.functional.todoApp.user.todos.index(connection, {
    body: {
      limit: 20,
      page: 1,
    } satisfies ITodoAppTodo.IRequest,
  });
  typia.assert(allResults);

  TestValidator.equals(
    "total records should match created todos count",
    allResults.pagination.records,
    createdTodos.length,
  );

  // Test 3.9: Test boundary conditions
  const maxLimitResults = await api.functional.todoApp.user.todos.index(
    connection,
    {
      body: {
        limit: 100, // Maximum allowed limit
        page: 1,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(maxLimitResults);

  TestValidator.predicate(
    "maximum limit should work correctly",
    maxLimitResults.data.length <= 100,
  );

  // Test 3.10: Test error handling with invalid parameters
  await TestValidator.error("should reject invalid page number", async () => {
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        page: 0, // Invalid: page must be >= 1
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    });
  });

  await TestValidator.error("should reject invalid limit", async () => {
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        page: 1,
        limit: 0, // Invalid: limit must be >= 1
      } satisfies ITodoAppTodo.IRequest,
    });
  });
}
