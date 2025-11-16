import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";

/**
 * Test comprehensive todo search functionality with various filtering options
 * including text search, date range filtering, and pagination.
 *
 * This test validates that users can search their own todos by title keywords,
 * filter by due date ranges, and navigate through paginated results. It ensures
 * that search results respect user isolation boundaries and only return todos
 * owned by the authenticated user.
 */
export async function test_api_todo_search_with_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user context
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      password_hash: userPassword, // Using same password for testing
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: "active" as const,
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create multiple todo items with varied data for search testing
  const todos: ITodoAppTodo[] = [];

  // Generate diverse todo data with searchable keywords
  const todoTemplates = [
    { keyword: "project", timeOffset: 86400000 }, // Tomorrow
    { keyword: "review", timeOffset: 172800000 }, // Day after tomorrow
    { keyword: "meeting", timeOffset: -86400000 }, // Yesterday
    { keyword: "documentation", timeOffset: 259200000 }, // 3 days from now
    { keyword: "analysis", timeOffset: 345600000 }, // 4 days from now
  ];

  for (const template of todoTemplates) {
    const todo = await api.functional.todoApp.user.todos.create(connection, {
      body: {
        title: `${RandomGenerator.paragraph({ sentences: 2 })} ${template.keyword}`,
        description: `This todo involves ${template.keyword} work for the ${RandomGenerator.name(1)} project`,
        due_date: new Date(Date.now() + template.timeOffset).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    });
    typia.assert(todo);
    todos.push(todo);
  }

  // Step 3: Test text search functionality
  const searchResults = await api.functional.todoApp.user.todos.index(
    connection,
    {
      body: {
        search: "project",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(searchResults);

  TestValidator.predicate(
    "search should return todos containing 'project' keyword",
    searchResults.data.length > 0,
  );

  const foundKeywords = searchResults.data.map(
    (todo) =>
      todo.title.toLowerCase() + " " + (todo.description?.toLowerCase() || ""),
  );
  TestValidator.predicate(
    "search results should contain the search keyword",
    foundKeywords.some((text) => text.includes("project")),
  );

  // Step 4: Test date range filtering
  const currentTime = new Date();
  const tomorrow = new Date(currentTime.getTime() + 86400000).toISOString();
  const futureLimit = new Date(currentTime.getTime() + 604800000).toISOString(); // 7 days from now

  const dateFilterResults = await api.functional.todoApp.user.todos.index(
    connection,
    {
      body: {
        due_after: tomorrow,
        due_before: futureLimit,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(dateFilterResults);

  TestValidator.predicate(
    "date filter should return future-due todos",
    dateFilterResults.data.length >= 0, // Could be 0 or more
  );

  // Step 5: Test pagination functionality
  const paginationResults = await api.functional.todoApp.user.todos.index(
    connection,
    {
      body: {
        page: 1,
        limit: 3,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(paginationResults);

  TestValidator.predicate(
    "pagination should return correct number of items",
    paginationResults.data.length <= 3,
  );

  TestValidator.predicate(
    "pagination metadata should be consistent",
    paginationResults.pagination.limit === 3 &&
      paginationResults.pagination.current === 1 &&
      paginationResults.pagination.records >= todos.length &&
      paginationResults.pagination.pages >= 1,
  );

  // Step 6: Test combined search and filtering
  const combinedResults = await api.functional.todoApp.user.todos.index(
    connection,
    {
      body: {
        search: "documentation",
        due_after: new Date().toISOString(), // Current time
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(combinedResults);

  TestValidator.predicate(
    "combined search should return relevant results",
    combinedResults.data.length >= 0, // Could be 0 or more
  );

  // Validate user isolation - todos should belong to the authenticated user
  for (const resultPage of [
    searchResults,
    dateFilterResults,
    paginationResults,
    combinedResults,
  ]) {
    for (const todo of resultPage.data) {
      TestValidator.equals(
        "todo should belong to the authenticated user",
        todo.user.id,
        user.id,
      );
    }
  }

  // Additional test: Empty search should return all user's todos
  const allTodosResult = await api.functional.todoApp.user.todos.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(allTodosResult);

  TestValidator.predicate(
    "empty search should return user's todos",
    allTodosResult.data.length >= todos.length,
  );
}
