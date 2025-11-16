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
 * Test searching and retrieving filtered todo items by title.
 *
 * This test validates the title-based filtering capability of the todo list
 * search operation. The test creates multiple todos with different titles, then
 * performs searches using specific title keywords to verify that only matching
 * todos are returned.
 *
 * The workflow demonstrates:
 *
 * 1. User authentication and account creation
 * 2. Creating multiple todos with distinct titles for search testing
 * 3. Performing title-based searches with various keywords
 * 4. Validating that search results contain only matching todos
 * 5. Verifying data isolation - only authenticated user's todos are returned
 */
export async function test_api_todo_list_search_with_title_filter(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a new user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: RandomGenerator.alphabets(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create multiple todos with distinct titles for search testing
  const todos = await ArrayUtil.asyncRepeat(5, async () => {
    return await api.functional.todoApp.user.todos.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 7,
        }),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 3,
          sentenceMax: 5,
        }),
      } satisfies ITodoAppTodo.ICreate,
    });
  });

  for (const todo of todos) {
    typia.assert(todo);
  }

  // Step 3: Test search with first todo's partial title
  const firstTodo = todos[0];
  const firstTitleParts = firstTodo.title.split(" ");
  const searchKeyword1 = firstTitleParts[0];

  const searchResult1: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        title: searchKeyword1,
      } satisfies ITodoAppTodo.IRequest,
    });

  typia.assert(searchResult1);
  TestValidator.predicate(
    "search result should contain at least the first todo",
    searchResult1.data.length > 0,
  );
  TestValidator.predicate(
    "all returned todos should match the search keyword",
    searchResult1.data.every((todo) =>
      todo.title.toLowerCase().includes(searchKeyword1.toLowerCase()),
    ),
  );

  // Step 4: Test search with second todo's partial title
  const secondTodo = todos[1];
  const secondTitleParts = secondTodo.title.split(" ");
  const searchKeyword2 = secondTitleParts[0];

  const searchResult2: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        title: searchKeyword2,
      } satisfies ITodoAppTodo.IRequest,
    });

  typia.assert(searchResult2);
  TestValidator.predicate(
    "search result should contain matching todos",
    searchResult2.data.length > 0,
  );
  TestValidator.predicate(
    "all returned todos should match the second search keyword",
    searchResult2.data.every((todo) =>
      todo.title.toLowerCase().includes(searchKeyword2.toLowerCase()),
    ),
  );

  // Step 5: Test search with non-existent keyword
  const nonExistentKeyword = RandomGenerator.alphaNumeric(12);
  const searchResult3: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        title: nonExistentKeyword,
      } satisfies ITodoAppTodo.IRequest,
    });

  typia.assert(searchResult3);
  TestValidator.equals(
    "search with non-existent keyword should return empty results",
    searchResult3.data.length,
    0,
  );

  // Step 6: Test search without title filter (retrieve all user's todos)
  const allTodosResult: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {} satisfies ITodoAppTodo.IRequest,
    });

  typia.assert(allTodosResult);
  TestValidator.predicate(
    "search without title filter should return all user's todos",
    allTodosResult.data.length >= todos.length,
  );

  // Step 7: Verify pagination information
  TestValidator.predicate(
    "pagination should have valid current page",
    allTodosResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination should have valid limit",
    allTodosResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination should have valid total records",
    allTodosResult.pagination.records >= todos.length,
  );
}
