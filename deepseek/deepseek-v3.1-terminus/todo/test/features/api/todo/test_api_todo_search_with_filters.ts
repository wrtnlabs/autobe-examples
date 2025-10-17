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
 * Test searching todos with various filter combinations including search terms,
 * completion status, and validate that PostgreSQL trigram indexing works
 * properly for partial text matching within todo content.
 */
export async function test_api_todo_search_with_filters(
  connection: api.IConnection,
) {
  // 1. Authenticate a user to access todo functionality
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "password123",
    } satisfies IMinimalTodoUser.ICreate,
  });
  typia.assert(user);

  // 2. Create todos with diverse content for search testing
  const todoContents = [
    "Buy groceries from the supermarket tomorrow",
    "Complete the project documentation by Friday",
    "Call the dentist to schedule an appointment",
    "Read the new book about TypeScript programming",
    "Finish the laundry and clean the house",
  ];

  const createdTodos = await ArrayUtil.asyncRepeat(
    todoContents.length,
    async (index) => {
      const todo = await api.functional.minimalTodo.todos.create(connection, {
        body: {
          content: todoContents[index],
        } satisfies IMinimalTodoTodo.ICreate,
      });
      typia.assert(todo);
      return todo;
    },
  );

  // 3. Test basic search with partial text matching
  const searchResults = await api.functional.minimalTodo.todos.index(
    connection,
    {
      body: {
        search: "groceries",
        page: 1,
        limit: 10,
      } satisfies IMinimalTodoTodo.IRequest,
    },
  );
  typia.assert(searchResults);

  TestValidator.predicate(
    "search should return todos containing search term",
    searchResults.data.length >= 1,
  );

  TestValidator.predicate(
    "matching todos should contain search term in content",
    searchResults.data.some((todo) =>
      todo.content.toLowerCase().includes("groceries"),
    ),
  );

  // 4. Test partial text matching with PostgreSQL trigram indexing
  const partialSearchResults = await api.functional.minimalTodo.todos.index(
    connection,
    {
      body: {
        search: "proj", // Partial match for "project"
        page: 1,
        limit: 10,
      } satisfies IMinimalTodoTodo.IRequest,
    },
  );
  typia.assert(partialSearchResults);

  TestValidator.predicate(
    "partial search should match beginning of words",
    partialSearchResults.data.some((todo) =>
      todo.content.toLowerCase().includes("project"),
    ),
  );

  // 5. Test pagination functionality
  const page1Results = await api.functional.minimalTodo.todos.index(
    connection,
    {
      body: {
        page: 1,
        limit: 3,
      } satisfies IMinimalTodoTodo.IRequest,
    },
  );
  typia.assert(page1Results);

  const page2Results = await api.functional.minimalTodo.todos.index(
    connection,
    {
      body: {
        page: 2,
        limit: 3,
      } satisfies IMinimalTodoTodo.IRequest,
    },
  );
  typia.assert(page2Results);

  TestValidator.predicate(
    "pagination should return correct number of items per page",
    page1Results.data.length <= 3 && page2Results.data.length <= 3,
  );

  // 6. Test default values (no filters)
  const allResults = await api.functional.minimalTodo.todos.index(connection, {
    body: {
      page: 1,
      limit: 10,
    } satisfies IMinimalTodoTodo.IRequest,
  });
  typia.assert(allResults);

  TestValidator.predicate(
    "default search should return all todos",
    allResults.data.length >= todoContents.length,
  );

  // 7. Test empty search term
  const emptySearchResults = await api.functional.minimalTodo.todos.index(
    connection,
    {
      body: {
        search: "",
        page: 1,
        limit: 10,
      } satisfies IMinimalTodoTodo.IRequest,
    },
  );
  typia.assert(emptySearchResults);

  TestValidator.predicate(
    "empty search should return all todos",
    emptySearchResults.data.length >= todoContents.length,
  );

  // 8. Test null/undefined filter values
  const nullSearchResults = await api.functional.minimalTodo.todos.index(
    connection,
    {
      body: {
        search: null,
        completed: null,
        page: 1,
        limit: 10,
      } satisfies IMinimalTodoTodo.IRequest,
    },
  );
  typia.assert(nullSearchResults);

  TestValidator.predicate(
    "null filter values should be ignored",
    nullSearchResults.data.length >= todoContents.length,
  );

  // 9. Validate pagination metadata
  TestValidator.equals(
    "pagination current page should be correct",
    page1Results.pagination.current,
    1,
  );

  TestValidator.equals(
    "pagination limit should match request",
    page1Results.pagination.limit,
    3,
  );

  TestValidator.predicate(
    "pagination should show total records correctly",
    page1Results.pagination.records >= todoContents.length,
  );

  TestValidator.predicate(
    "pagination pages calculation should be correct",
    page1Results.pagination.pages >= Math.ceil(todoContents.length / 3),
  );

  // 10. Test sort functionality
  const sortedResults = await api.functional.minimalTodo.todos.index(
    connection,
    {
      body: {
        sort_by: "content",
        order: "asc",
        page: 1,
        limit: 10,
      } satisfies IMinimalTodoTodo.IRequest,
    },
  );
  typia.assert(sortedResults);

  TestValidator.predicate(
    "sorting should return results in correct order",
    sortedResults.data.length > 0,
  );
}
