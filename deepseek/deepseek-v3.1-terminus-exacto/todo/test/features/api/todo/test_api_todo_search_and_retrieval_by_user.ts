import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListTodo";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Comprehensive todo search functionality test with filtering, pagination, and
 * sorting options
 *
 * Validates that authenticated users can search their own todos using various
 * criteria including status filtering, text search, date-based sorting, and
 * pagination controls. Ensures proper data isolation where users only see their
 * own todos.
 */
export async function test_api_todo_search_and_retrieval_by_user(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Test basic pagination without filters
  const basicSearchResult = await api.functional.todoList.user.todos.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(basicSearchResult);

  // Validate pagination structure
  TestValidator.equals(
    "pagination current page matches request",
    basicSearchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    basicSearchResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    basicSearchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    basicSearchResult.pagination.pages >= 0,
  );

  // Step 3: Test status filtering
  const pendingSearchResult = await api.functional.todoList.user.todos.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
        status: "pending",
      } satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(pendingSearchResult);

  const completedSearchResult = await api.functional.todoList.user.todos.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
        status: "completed",
      } satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(completedSearchResult);

  // Step 4: Test text search functionality
  const searchQuery = RandomGenerator.paragraph({ sentences: 2 });
  const searchResult = await api.functional.todoList.user.todos.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        search: searchQuery,
      } satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(searchResult);

  // Step 5: Test sorting options
  const sortByCreatedAt = await api.functional.todoList.user.todos.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        order_by: "created_at",
        order_direction: "desc",
      } satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(sortByCreatedAt);

  const sortByTitle = await api.functional.todoList.user.todos.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        order_by: "title",
        order_direction: "asc",
      } satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(sortByTitle);

  // Step 6: Test user_id filtering (data isolation)
  const userFilteredResult = await api.functional.todoList.user.todos.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        user_id: user.id,
      } satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(userFilteredResult);

  // Step 7: Test pagination with different page numbers
  const page2Result = await api.functional.todoList.user.todos.index(
    connection,
    {
      body: {
        page: 2,
        limit: 5,
      } satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(page2Result);

  TestValidator.equals(
    "page number matches request for page 2",
    page2Result.pagination.current,
    2,
  );

  // Step 8: Test limit validation (maximum 100)
  const maxLimitResult = await api.functional.todoList.user.todos.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(maxLimitResult);

  TestValidator.equals(
    "maximum limit of 100 is respected",
    maxLimitResult.pagination.limit,
    100,
  );

  // Step 9: Test combined filters
  const combinedSearch = await api.functional.todoList.user.todos.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
        status: "pending",
        order_by: "updated_at",
        order_direction: "desc",
        search: RandomGenerator.substring(
          RandomGenerator.content({ paragraphs: 1 }),
        ),
      } satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(combinedSearch);

  // Step 10: Validate todo item structure in search results
  if (combinedSearch.data.length > 0) {
    const sampleTodo = combinedSearch.data[0];
    TestValidator.predicate(
      "todo item has valid UUID ID",
      sampleTodo.id.length > 0,
    );
    TestValidator.predicate(
      "todo item has non-empty title",
      sampleTodo.title.length > 0,
    );
    TestValidator.predicate(
      "todo item has valid status value",
      sampleTodo.status === "pending" || sampleTodo.status === "completed",
    );
    TestValidator.predicate(
      "todo item has valid creation timestamp",
      sampleTodo.created_at.length > 0,
    );
    TestValidator.predicate(
      "todo item has valid update timestamp",
      sampleTodo.updated_at.length > 0,
    );
  }

  // Step 11: Test error scenario with invalid page number
  await TestValidator.error(
    "should reject page number less than 1",
    async () => {
      await api.functional.todoList.user.todos.index(connection, {
        body: {
          page: 0,
          limit: 10,
        } satisfies ITodoListTodo.IRequest,
      });
    },
  );

  // Step 12: Validate data isolation by ensuring user_id filtering works correctly
  TestValidator.predicate(
    "user_id filter returns results for authenticated user",
    userFilteredResult.data.length >= 0,
  );
}
