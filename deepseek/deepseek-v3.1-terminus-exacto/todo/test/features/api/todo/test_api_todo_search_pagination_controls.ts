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
 * Validate pagination functionality by creating a large number of todo items
 * and verifying that search results are correctly paginated.
 *
 * This test creates a new user account, authenticates, generates 25 todo items
 * exceeding default pagination limits, and tests various pagination scenarios
 * including different page sizes and boundary conditions.
 */
export async function test_api_todo_search_pagination_controls(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      password_hash: "", // Will be hashed by server
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: undefined,
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create 25 todo items to exceed default pagination limits
  const todos = await ArrayUtil.asyncRepeat(25, async (index) => {
    const todo = await api.functional.todos.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 8,
        }),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 2,
          sentenceMax: 5,
        }),
        due_date: undefined,
      } satisfies ITodoAppTodo.ICreate,
    });
    typia.assert(todo);
    return todo;
  });

  // Step 3: Test pagination with limit of 5 items per page
  const pageSize5 = 5;
  const totalPages5 = Math.ceil(todos.length / pageSize5);

  // Test first page
  const page1Result = await api.functional.todos.search(connection, {
    body: {
      page: 1,
      limit: pageSize5,
    } satisfies ITodoAppTodo.IRequest,
  });
  typia.assert(page1Result);

  TestValidator.equals(
    "first page current should be 1",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page limit should match request",
    page1Result.pagination.limit,
    pageSize5,
  );
  TestValidator.equals(
    "first page total records should match created todos",
    page1Result.pagination.records,
    todos.length,
  );
  TestValidator.equals(
    "first page total pages should be correct",
    page1Result.pagination.pages,
    totalPages5,
  );
  TestValidator.equals(
    "first page should have full limit items",
    page1Result.data.length,
    pageSize5,
  );

  // Test middle page
  const middlePage = Math.floor(totalPages5 / 2);
  const middlePageResult = await api.functional.todos.search(connection, {
    body: {
      page: middlePage,
      limit: pageSize5,
    } satisfies ITodoAppTodo.IRequest,
  });
  typia.assert(middlePageResult);

  TestValidator.equals(
    "middle page current should match request",
    middlePageResult.pagination.current,
    middlePage,
  );
  TestValidator.equals(
    "middle page limit should match request",
    middlePageResult.pagination.limit,
    pageSize5,
  );
  TestValidator.equals(
    "middle page total records should be consistent",
    middlePageResult.pagination.records,
    todos.length,
  );
  TestValidator.equals(
    "middle page total pages should be consistent",
    middlePageResult.pagination.pages,
    totalPages5,
  );
  TestValidator.equals(
    "middle page should have full limit items",
    middlePageResult.data.length,
    pageSize5,
  );

  // Test last page
  const lastPageResult = await api.functional.todos.search(connection, {
    body: {
      page: totalPages5,
      limit: pageSize5,
    } satisfies ITodoAppTodo.IRequest,
  });
  typia.assert(lastPageResult);

  TestValidator.equals(
    "last page current should match request",
    lastPageResult.pagination.current,
    totalPages5,
  );
  TestValidator.equals(
    "last page limit should match request",
    lastPageResult.pagination.limit,
    pageSize5,
  );
  TestValidator.equals(
    "last page total records should be consistent",
    lastPageResult.pagination.records,
    todos.length,
  );
  TestValidator.equals(
    "last page total pages should be consistent",
    lastPageResult.pagination.pages,
    totalPages5,
  );

  const expectedLastPageItems = todos.length % pageSize5 || pageSize5;
  TestValidator.equals(
    "last page should have correct item count",
    lastPageResult.data.length,
    expectedLastPageItems,
  );

  // Step 4: Test pagination with limit of 10 items per page
  const pageSize10 = 10;
  const totalPages10 = Math.ceil(todos.length / pageSize10);

  const page1Result10 = await api.functional.todos.search(connection, {
    body: {
      page: 1,
      limit: pageSize10,
    } satisfies ITodoAppTodo.IRequest,
  });
  typia.assert(page1Result10);

  TestValidator.equals(
    "page 1 with limit 10 current should be 1",
    page1Result10.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 with limit 10 limit should match",
    page1Result10.pagination.limit,
    pageSize10,
  );
  TestValidator.equals(
    "page 1 with limit 10 total records should be consistent",
    page1Result10.pagination.records,
    todos.length,
  );
  TestValidator.equals(
    "page 1 with limit 10 total pages should be correct",
    page1Result10.pagination.pages,
    totalPages10,
  );
  TestValidator.equals(
    "page 1 with limit 10 should have full limit items",
    page1Result10.data.length,
    pageSize10,
  );

  // Step 5: Test pagination with limit larger than total items
  const largeLimitResult = await api.functional.todos.search(connection, {
    body: {
      page: 1,
      limit: 100,
    } satisfies ITodoAppTodo.IRequest,
  });
  typia.assert(largeLimitResult);

  TestValidator.equals(
    "large limit current should be 1",
    largeLimitResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "large limit should match request",
    largeLimitResult.pagination.limit,
    100,
  );
  TestValidator.equals(
    "large limit total records should be consistent",
    largeLimitResult.pagination.records,
    todos.length,
  );
  TestValidator.equals(
    "large limit total pages should be 1",
    largeLimitResult.pagination.pages,
    1,
  );
  TestValidator.equals(
    "large limit should return all items",
    largeLimitResult.data.length,
    todos.length,
  );

  // Step 6: Test default pagination (no parameters)
  const defaultResult = await api.functional.todos.search(connection, {
    body: {} satisfies ITodoAppTodo.IRequest,
  });
  typia.assert(defaultResult);

  TestValidator.predicate(
    "default pagination should return results",
    defaultResult.data.length > 0,
  );
  TestValidator.predicate(
    "default pagination should have valid current page",
    defaultResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "default pagination should have positive limit",
    defaultResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "default pagination should have correct total records",
    defaultResult.pagination.records === todos.length,
  );
  TestValidator.predicate(
    "default pagination should have valid total pages",
    defaultResult.pagination.pages > 0,
  );

  // Step 7: Test error handling for out-of-bounds page
  await TestValidator.error("page number 0 should fail", async () => {
    await api.functional.todos.search(connection, {
      body: {
        page: 0,
        limit: pageSize5,
      } satisfies ITodoAppTodo.IRequest,
    });
  });

  await TestValidator.error("page beyond total pages should fail", async () => {
    await api.functional.todos.search(connection, {
      body: {
        page: totalPages5 + 10,
        limit: pageSize5,
      } satisfies ITodoAppTodo.IRequest,
    });
  });
}
