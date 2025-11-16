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
 * Test the basic search functionality for todo items using various filter
 * combinations.
 *
 * This test validates the search API by creating multiple todo items with
 * diverse attributes and testing different search scenarios including text
 * search, date range filtering, and pagination controls. The test ensures that
 * search results correctly filter todos based on the authenticated user's
 * ownership and respect all provided search parameters.
 */
export async function test_api_todo_search_basic_filtering(
  connection: api.IConnection,
) {
  // 1. Create a new user account for authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      password_hash: userPassword, // Server will hash this properly
      status: "pending" as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: undefined,
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // 2. Create multiple todo items with varied attributes for search testing
  const todos = await ArrayUtil.asyncRepeat(5, async (index) => {
    const dueDate =
      index % 2 === 0
        ? new Date(Date.now() + (index + 1) * 86400000).toISOString() // Future dates
        : undefined;

    const todo = await api.functional.todos.create(connection, {
      body: {
        title: `Todo ${index + 1} ${index % 2 === 0 ? "urgent" : "normal"}`,
        description:
          index % 3 === 0
            ? `This is a detailed description for todo ${index + 1} with important notes`
            : undefined,
        due_date: dueDate,
      } satisfies ITodoAppTodo.ICreate,
    });
    typia.assert(todo);
    return todo;
  });

  // 3. Test basic search without filters (should return all todos)
  const allTodosResult = await api.functional.todos.search(connection, {
    body: {} satisfies ITodoAppTodo.IRequest,
  });
  typia.assert(allTodosResult);
  TestValidator.equals(
    "should return all created todos",
    allTodosResult.data.length,
    todos.length,
  );

  // 4. Test text search in titles
  const titleSearchResult = await api.functional.todos.search(connection, {
    body: {
      search: "urgent",
    } satisfies ITodoAppTodo.IRequest,
  });
  typia.assert(titleSearchResult);
  TestValidator.predicate(
    "should find todos with 'urgent' in title",
    titleSearchResult.data.length > 0 &&
      titleSearchResult.data.every((todo) => todo.title.includes("urgent")),
  );

  // 5. Test text search in descriptions
  const descriptionSearchResult = await api.functional.todos.search(
    connection,
    {
      body: {
        search: "detailed description",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(descriptionSearchResult);
  TestValidator.predicate(
    "should find todos with 'detailed description' in description",
    descriptionSearchResult.data.length > 0 &&
      descriptionSearchResult.data.every(
        (todo) => todo.description?.includes("detailed description") ?? false,
      ),
  );

  // 6. Test date range filtering (only for todos with due dates)
  const todosWithDueDates = todos.filter((todo) => todo.due_date !== undefined);
  if (todosWithDueDates.length > 0) {
    const earliestDueDate = todosWithDueDates.reduce(
      (earliest, todo) =>
        todo.due_date! < earliest ? todo.due_date! : earliest,
      todosWithDueDates[0].due_date!,
    );

    const dateSearchResult = await api.functional.todos.search(connection, {
      body: {
        due_after: earliestDueDate,
      } satisfies ITodoAppTodo.IRequest,
    });
    typia.assert(dateSearchResult);
    TestValidator.predicate(
      "should find todos with due dates after earliest date",
      dateSearchResult.data.length >= todosWithDueDates.length,
    );
  }

  // 7. Test pagination controls
  const paginatedResult = await api.functional.todos.search(connection, {
    body: {
      page: 1,
      limit: 2,
    } satisfies ITodoAppTodo.IRequest,
  });
  typia.assert(paginatedResult);
  TestValidator.equals(
    "should return exactly 2 items per page",
    paginatedResult.data.length,
    2,
  );
  TestValidator.predicate(
    "pagination metadata should be correct",
    paginatedResult.pagination.current === 1 &&
      paginatedResult.pagination.limit === 2 &&
      paginatedResult.pagination.records >= todos.length &&
      paginatedResult.pagination.pages >= Math.ceil(todos.length / 2),
  );

  // 8. Test combined search with multiple filters
  const combinedSearchResult = await api.functional.todos.search(connection, {
    body: {
      search: "todo",
      limit: 10,
    } satisfies ITodoAppTodo.IRequest,
  });
  typia.assert(combinedSearchResult);
  TestValidator.predicate(
    "combined search should return relevant results",
    combinedSearchResult.data.length > 0 &&
      combinedSearchResult.data.every((todo) => todo.title.includes("todo")),
  );

  // 9. Test empty search result scenario
  const noMatchSearchResult = await api.functional.todos.search(connection, {
    body: {
      search: "nonexistentkeyword12345",
    } satisfies ITodoAppTodo.IRequest,
  });
  typia.assert(noMatchSearchResult);
  TestValidator.equals(
    "should return empty results for non-matching search",
    noMatchSearchResult.data.length,
    0,
  );
}
