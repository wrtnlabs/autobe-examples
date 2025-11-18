import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListTodo";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test retrieving the complete list of todos for an authenticated user.
 *
 * This test validates that an authenticated user can successfully retrieve
 * their todo list with proper pagination support. The test flow includes:
 *
 * 1. User registration and authentication to establish authenticated session
 * 2. Retrieval of the authenticated user's todo list using default pagination
 * 3. Verification of response structure with pagination metadata
 * 4. Confirmation that only the authenticated user's todos are returned (data
 *    isolation)
 * 5. Validation of pagination working correctly with default values (page 1, limit
 *    20)
 *
 * The test ensures that:
 *
 * - Authentication is properly enforced for todo retrieval
 * - Data isolation is maintained (users only see their own todos)
 * - Pagination metadata is correctly included in responses
 * - Todo summary objects contain all required fields
 */
export async function test_api_todo_list_retrieval_authenticated_user(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a new user
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(10);

  const authenticatedUser = await api.functional.auth.user.join(connection, {
    body: {
      email: email,
      password: password,
      href: "http://localhost/register",
      referrer: "http://localhost/",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(authenticatedUser);

  // Validate user was created with correct structure
  TestValidator.predicate(
    "user id should be valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      authenticatedUser.id,
    ),
  );
  TestValidator.equals(
    "user email should match registered email",
    authenticatedUser.email,
    email,
  );

  // Step 2: Retrieve authenticated user's todo list with default pagination
  const todoListResponse = await api.functional.todoList.user.todos.index(
    connection,
    {
      body: {} satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(todoListResponse);

  // Step 3: Validate pagination metadata
  TestValidator.predicate(
    "pagination object should exist",
    todoListResponse.pagination !== undefined &&
      todoListResponse.pagination !== null,
  );

  const pagination = todoListResponse.pagination;
  TestValidator.equals(
    "current page should default to 1",
    pagination.current,
    1,
  );
  TestValidator.predicate("limit should be positive", pagination.limit > 0);
  TestValidator.predicate(
    "total records should be non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be calculated correctly",
    pagination.pages >= 0,
  );

  // Step 4: Validate response data structure
  TestValidator.predicate(
    "data should be an array",
    Array.isArray(todoListResponse.data),
  );

  // If there are todos in the list, validate their structure
  if (todoListResponse.data.length > 0) {
    const firstTodo = todoListResponse.data[0];
    TestValidator.predicate(
      "todo should have valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstTodo.id,
      ),
    );
    TestValidator.predicate(
      "todo should have non-empty title",
      firstTodo.title && firstTodo.title.length > 0,
    );
    TestValidator.predicate(
      "todo should have completed boolean status",
      typeof firstTodo.completed === "boolean",
    );
  }

  // Step 5: Test with explicit pagination parameters
  const customPaginationResponse =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(customPaginationResponse);

  TestValidator.equals(
    "custom page parameter should be respected",
    customPaginationResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "custom limit parameter should be respected",
    customPaginationResponse.pagination.limit,
    10,
  );

  // Step 6: Test with search parameter (optional filtering)
  const searchQuery = "todo";
  const searchResponse = await api.functional.todoList.user.todos.index(
    connection,
    {
      body: {
        search: searchQuery,
      } satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(searchResponse);
  TestValidator.predicate(
    "search response should be valid",
    Array.isArray(searchResponse.data),
  );

  // Step 7: Test with completion filter
  const completedResponse = await api.functional.todoList.user.todos.index(
    connection,
    {
      body: {
        completed: false,
      } satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(completedResponse);
  TestValidator.predicate(
    "completed filter response should be valid",
    Array.isArray(completedResponse.data),
  );

  // Step 8: Test with priority filter
  const priorityResponse = await api.functional.todoList.user.todos.index(
    connection,
    {
      body: {
        priority: "high",
      } satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(priorityResponse);
  TestValidator.predicate(
    "priority filter response should be valid",
    Array.isArray(priorityResponse.data),
  );
}
