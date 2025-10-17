import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodos } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodos";
import type { ITodoAppAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthenticatedUser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodos } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodos";

/**
 * Test todo list pagination functionality with large datasets.
 *
 * This test validates that the pagination system correctly handles large
 * collections of todos (over 20 items) and ensures proper organization,
 * performance, and accuracy. The test:
 *
 * 1. Creates an authenticated user account
 * 2. Creates 25+ todos to build a substantial dataset for pagination testing
 * 3. Validates pagination structure (current page, limit, total records, total
 *    pages)
 * 4. Verifies correct page size and offset handling
 * 5. Tests multiple page retrieval with proper offset calculations
 * 6. Validates performance with large datasets (queries complete within acceptable
 *    time)
 * 7. Ensures data consistency across paginated requests
 */
export async function test_api_todos_list_pagination_with_large_datasets(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user
  const user: ITodoAppAuthenticatedUser.IAuthorized =
    await api.functional.auth.authenticatedUser.join(connection, {
      body: {
        email:
          typia
            .random<string & tags.Format<"email">>()
            .split("@")[0]
            .substring(0, 10)
            .toLowerCase() + "@test.com",
        password: "SecurePassword123!",
      } satisfies ITodoAppAuthenticatedUser.ICreate,
    });
  typia.assert(user);
  TestValidator.predicate(
    "user authenticated with token",
    user.token !== undefined,
  );

  // Step 2: Create 25+ todos with varied content for pagination testing
  const todoTitles = ArrayUtil.repeat(28, (index) => {
    const prefix =
      index % 3 === 0 ? "[COMPLETED] " : index % 5 === 0 ? "[URGENT] " : "";
    return prefix + "Todo Item " + (index + 1).toString();
  });

  const createdTodos: ITodoAppTodo[] = await ArrayUtil.asyncMap(
    todoTitles,
    async (title) => {
      const todo = await api.functional.todoApp.todos.create(connection, {
        body: {
          title: title,
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 2,
            sentenceMax: 4,
          }),
        } satisfies ITodoAppTodo.ICreate,
      });
      typia.assert(todo);
      return todo;
    },
  );

  TestValidator.equals("created 28 todos", createdTodos.length, 28);

  // Step 3: Test first page with default limit (20)
  const startTime1 = new Date().getTime();
  const firstPage: IPageITodoAppTodos =
    await api.functional.todoApp.authenticatedUser.todos.index(connection, {
      body: {
        page: 1,
        limit: 20,
      } satisfies ITodoAppTodos.ISearchRequest,
    });
  const endTime1 = new Date().getTime();
  typia.assert(firstPage);

  // Validate pagination structure
  TestValidator.predicate(
    "pagination object exists",
    firstPage.pagination !== undefined && firstPage.pagination !== null,
  );
  TestValidator.equals("current page is 1", firstPage.pagination.current, 1);
  TestValidator.equals("page limit is 20", firstPage.pagination.limit, 20);
  TestValidator.equals("total records is 28", firstPage.pagination.records, 28);
  TestValidator.predicate(
    "total pages calculated correctly",
    firstPage.pagination.pages === 2 || firstPage.pagination.pages > 1,
  );

  // Validate data array
  TestValidator.equals(
    "first page returns 20 items",
    firstPage.data.length,
    20,
  );
  TestValidator.predicate("data is array", Array.isArray(firstPage.data));

  // Validate each item in data is a todo
  for (const item of firstPage.data) {
    typia.assert<ITodoAppTodo>(item);
  }

  // Performance check
  const responseTime1 = endTime1 - startTime1;
  TestValidator.predicate(
    "first page query completes within 1 second",
    responseTime1 < 1000,
  );

  // Step 4: Test second page with offset
  const startTime2 = new Date().getTime();
  const secondPage: IPageITodoAppTodos =
    await api.functional.todoApp.authenticatedUser.todos.index(connection, {
      body: {
        page: 2,
        limit: 20,
      } satisfies ITodoAppTodos.ISearchRequest,
    });
  const endTime2 = new Date().getTime();
  typia.assert(secondPage);

  TestValidator.equals(
    "second page number is 2",
    secondPage.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page limit is 20",
    secondPage.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "second page has remaining items",
    secondPage.data.length > 0,
  );
  TestValidator.predicate(
    "second page has 8 items (28 - 20)",
    secondPage.data.length === 8,
  );

  // Validate second page data structure
  for (const item of secondPage.data) {
    typia.assert<ITodoAppTodo>(item);
  }

  // Performance check
  const responseTime2 = endTime2 - startTime2;
  TestValidator.predicate(
    "second page query completes within 1 second",
    responseTime2 < 1000,
  );

  // Step 5: Test custom page size (smaller limit)
  const smallPageSize: IPageITodoAppTodos =
    await api.functional.todoApp.authenticatedUser.todos.index(connection, {
      body: {
        page: 1,
        limit: 5,
      } satisfies ITodoAppTodos.ISearchRequest,
    });
  typia.assert(smallPageSize);

  TestValidator.equals(
    "small page size returns 5 items",
    smallPageSize.data.length,
    5,
  );
  TestValidator.equals(
    "pagination limit reflects requested size",
    smallPageSize.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "total pages calculated for small limit",
    smallPageSize.pagination.pages >= 6,
  );

  // Step 6: Test sorting by creation date (descending - newest first)
  const sortedResults: IPageITodoAppTodos =
    await api.functional.todoApp.authenticatedUser.todos.index(connection, {
      body: {
        sortBy: "createdAt",
        sortOrder: "desc",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodos.ISearchRequest,
    });
  typia.assert(sortedResults);

  TestValidator.predicate(
    "sorted results pagination valid",
    sortedResults.pagination.records === 28,
  );
  TestValidator.equals(
    "sorted results returns items",
    sortedResults.data.length,
    10,
  );

  // Step 7: Test sorting ascending
  const sortedAscending: IPageITodoAppTodos =
    await api.functional.todoApp.authenticatedUser.todos.index(connection, {
      body: {
        sortBy: "createdAt",
        sortOrder: "asc",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodos.ISearchRequest,
    });
  typia.assert(sortedAscending);

  TestValidator.equals(
    "ascending sort returns items",
    sortedAscending.data.length,
    10,
  );

  // Step 8: Test filtering by completion status
  const incompleteResults: IPageITodoAppTodos =
    await api.functional.todoApp.authenticatedUser.todos.index(connection, {
      body: {
        isCompleted: false,
        page: 1,
        limit: 20,
      } satisfies ITodoAppTodos.ISearchRequest,
    });
  typia.assert(incompleteResults);

  TestValidator.predicate(
    "incomplete filter results valid",
    incompleteResults.pagination.records > 0,
  );

  // Step 9: Verify total count consistency across requests
  const totalCountFromFirstPage = firstPage.pagination.records;
  const totalCountFromSecondPage = secondPage.pagination.records;

  TestValidator.equals(
    "total count consistent across pages",
    totalCountFromFirstPage,
    totalCountFromSecondPage,
  );

  // Step 10: Validate calculation of total pages
  const expectedPages = Math.ceil(28 / 20);
  TestValidator.equals(
    "total pages calculation correct",
    firstPage.pagination.pages,
    expectedPages,
  );

  // Step 11: Verify all todos can be retrieved through pagination
  let totalRetrieved = 0;
  const maxPages = firstPage.pagination.pages;

  for (let page = 1; page <= maxPages; page++) {
    const pageResult: IPageITodoAppTodos =
      await api.functional.todoApp.authenticatedUser.todos.index(connection, {
        body: {
          page: page,
          limit: 20,
        } satisfies ITodoAppTodos.ISearchRequest,
      });
    typia.assert(pageResult);

    if (Array.isArray(pageResult.data)) {
      totalRetrieved += pageResult.data.length;
    }
  }

  TestValidator.equals(
    "all todos retrievable through pagination",
    totalRetrieved,
    28,
  );

  // Step 12: Test that invalid page returns proper results or boundary handling
  const lastPage: IPageITodoAppTodos =
    await api.functional.todoApp.authenticatedUser.todos.index(connection, {
      body: {
        page: maxPages,
        limit: 20,
      } satisfies ITodoAppTodos.ISearchRequest,
    });
  typia.assert(lastPage);

  TestValidator.equals(
    "last page returns correct total count",
    lastPage.pagination.records,
    28,
  );
  TestValidator.predicate(
    "last page contains remaining items",
    lastPage.data.length > 0,
  );
}
