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
 * Test search pagination functionality with different page sizes and result
 * limits. Create a sufficient number of todos to require pagination, then test
 * various page sizes and navigation through result pages. Verify that
 * pagination metadata is accurate, that result ordering is consistent across
 * pages, and that maximum limit constraints are properly enforced.
 */
export async function test_api_todo_search_pagination_and_limits(
  connection: api.IConnection,
) {
  // Step 1: Create a user account for authentication
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const currentTimestamp: string = new Date().toISOString();
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "testPassword123",
        password_hash: "hashed_password_placeholder",
        status: "active" as const,
        created_at: currentTimestamp,
        updated_at: currentTimestamp,
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create multiple todos to ensure pagination is needed
  const todosToCreate: number = 15;
  const createdTodos: ITodoAppTodo[] = await ArrayUtil.asyncRepeat(
    todosToCreate,
    async (index) => {
      const todo: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
        connection,
        {
          body: {
            title: `Todo ${index + 1} - ${RandomGenerator.paragraph({ sentences: 3, wordMin: 2, wordMax: 8 })}`,
            description: RandomGenerator.content({
              paragraphs: 1,
              sentenceMin: 5,
              sentenceMax: 10,
            }),
            due_date:
              index % 3 === 0
                ? new Date(Date.now() + 86400000 * (index + 1)).toISOString()
                : undefined,
          } satisfies ITodoAppTodo.ICreate,
        },
      );
      typia.assert(todo);
      return todo;
    },
  );

  // Step 3: Test pagination with different page sizes
  const testPageSizes: number[] = [5, 10, 15];

  for (const pageSize of testPageSizes) {
    // Test first page
    const firstPage: IPageITodoAppTodo.ISummary =
      await api.functional.todoApp.user.search.todos.search(connection, {
        body: {
          page: 1,
          limit: pageSize,
        } satisfies ITodoAppTodo.IRequest,
      });
    typia.assert(firstPage);

    // Validate pagination metadata
    TestValidator.equals(
      "first page current page should be 1",
      firstPage.pagination.current,
      1,
    );
    TestValidator.equals(
      "limit should match requested page size",
      firstPage.pagination.limit,
      pageSize,
    );
    TestValidator.equals(
      "total records should match created todos",
      firstPage.pagination.records,
      todosToCreate,
    );
    TestValidator.equals(
      "total pages calculation should be correct",
      firstPage.pagination.pages,
      Math.ceil(todosToCreate / pageSize),
    );
    TestValidator.equals(
      "page data count should not exceed limit",
      firstPage.data.length,
      Math.min(pageSize, todosToCreate),
    );

    // Test that IDs exist in created todos
    for (const todo of firstPage.data) {
      TestValidator.predicate(
        "todo ID should exist in created todos",
        createdTodos.some((created) => created.id === todo.id),
      );
    }

    // Test navigation to second page if there are more pages
    if (firstPage.pagination.pages > 1) {
      const secondPage: IPageITodoAppTodo.ISummary =
        await api.functional.todoApp.user.search.todos.search(connection, {
          body: {
            page: 2,
            limit: pageSize,
          } satisfies ITodoAppTodo.IRequest,
        });
      typia.assert(secondPage);

      // Validate second page metadata
      TestValidator.equals(
        "second page current page should be 2",
        secondPage.pagination.current,
        2,
      );
      TestValidator.equals(
        "second page limit should match requested",
        secondPage.pagination.limit,
        pageSize,
      );

      // Test that no todo IDs overlap between pages
      const firstPageIds = new Set(firstPage.data.map((todo) => todo.id));
      const secondPageIds = new Set(secondPage.data.map((todo) => todo.id));

      TestValidator.predicate(
        "first and second page results should not overlap",
        Array.from(firstPageIds).every((id) => !secondPageIds.has(id)),
      );
    }
  }

  // Step 4: Test maximum limit constraints
  await TestValidator.error(
    "request exceeding maximum limit should fail",
    async () => {
      await api.functional.todoApp.user.search.todos.search(connection, {
        body: {
          page: 1,
          limit: 101, // Maximum limit is 100
        } satisfies ITodoAppTodo.IRequest,
      });
    },
  );

  // Step 5: Test boundary conditions
  // Test exactly at maximum limit
  const maxLimitPage: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.search.todos.search(connection, {
      body: {
        page: 1,
        limit: 100, // Maximum allowed limit
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(maxLimitPage);
  TestValidator.equals(
    "maximum limit page should succeed",
    maxLimitPage.pagination.limit,
    100,
  );

  // Test minimum limit
  const minLimitPage: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.search.todos.search(connection, {
      body: {
        page: 1,
        limit: 1, // Minimum limit
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(minLimitPage);
  TestValidator.equals(
    "minimum limit page should return 1 item",
    minLimitPage.data.length,
    1,
  );

  // Step 6: Test page number validation
  await TestValidator.error("page number less than 1 should fail", async () => {
    await api.functional.todoApp.user.search.todos.search(connection, {
      body: {
        page: 0, // Invalid page number
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    });
  });

  // Step 7: Test consistency of todo ordering across pages
  // Get all todos without pagination to compare ordering
  const allTodos: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.search.todos.search(connection, {
      body: {
        limit: todosToCreate, // Get all in one page
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(allTodos);

  // Verify that paginated results maintain the same order as full results
  const paginatedResults: ITodoAppTodo.ISummary[] = [];
  const pageSize = 5;

  for (let page = 1; page <= Math.ceil(todosToCreate / pageSize); page++) {
    const pageResult: IPageITodoAppTodo.ISummary =
      await api.functional.todoApp.user.search.todos.search(connection, {
        body: {
          page: page,
          limit: pageSize,
        } satisfies ITodoAppTodo.IRequest,
      });
    paginatedResults.push(...pageResult.data);
  }

  // Check that paginated results match the full results order
  TestValidator.equals(
    "paginated results should match full results count",
    paginatedResults.length,
    allTodos.data.length,
  );

  for (let i = 0; i < paginatedResults.length; i++) {
    TestValidator.equals(
      `todo at position ${i} should match between paginated and full results`,
      paginatedResults[i].id,
      allTodos.data[i].id,
    );
  }
}
