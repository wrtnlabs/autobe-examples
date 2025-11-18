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
 * Test that the todo list retrieval endpoint requires valid authentication.
 *
 * This test validates that the PATCH /todoList/user/todos endpoint properly
 * enforces authentication requirements. Unauthenticated requests or requests
 * with invalid authentication tokens should be rejected with 401 Unauthorized
 * errors, preventing unauthorized access to user's todo data.
 *
 * Test scenarios:
 *
 * 1. Create a valid user and obtain authentication token
 * 2. Attempt to access todo list with missing Authorization header
 * 3. Attempt to access todo list with malformed/invalid token
 * 4. Attempt to access todo list with invalid token format
 * 5. Verify authenticated request succeeds
 */
export async function test_api_todo_list_requires_authentication(
  connection: api.IConnection,
) {
  // Step 1: Register a user and obtain valid authentication token
  const validUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(validUser);
  const validToken = validUser.token.access;

  // Step 2: Test missing Authorization header
  // Create connection without authentication token
  const unauthenticatedConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "should reject request without authentication token",
    async () => {
      await api.functional.todoList.user.todos.index(unauthenticatedConn, {
        body: {
          page: 1,
          limit: 20,
        } satisfies ITodoListTodo.IRequest,
      });
    },
  );

  // Step 3: Test with invalid/malformed token
  const malformedTokenConn: api.IConnection = {
    ...connection,
    headers: { Authorization: "Bearer invalid.malformed.token" },
  };

  await TestValidator.error(
    "should reject request with malformed token",
    async () => {
      await api.functional.todoList.user.todos.index(malformedTokenConn, {
        body: {
          page: 1,
          limit: 20,
        } satisfies ITodoListTodo.IRequest,
      });
    },
  );

  // Step 4: Test with invalid token format
  const invalidFormatConn: api.IConnection = {
    ...connection,
    headers: { Authorization: "InvalidToken" },
  };

  await TestValidator.error(
    "should reject request with invalid token format",
    async () => {
      await api.functional.todoList.user.todos.index(invalidFormatConn, {
        body: {
          page: 1,
          limit: 20,
        } satisfies ITodoListTodo.IRequest,
      });
    },
  );

  // Step 5: Test with random invalid token
  const randomInvalidToken = `Bearer ${RandomGenerator.alphaNumeric(100)}`;
  const invalidTokenConn: api.IConnection = {
    ...connection,
    headers: { Authorization: randomInvalidToken },
  };

  await TestValidator.error(
    "should reject request with invalid token value",
    async () => {
      await api.functional.todoList.user.todos.index(invalidTokenConn, {
        body: {
          page: 1,
          limit: 20,
        } satisfies ITodoListTodo.IRequest,
      });
    },
  );

  // Step 6: Verify authenticated request succeeds
  const authenticatedConn: api.IConnection = {
    ...connection,
    headers: { Authorization: `Bearer ${validToken}` },
  };

  const result: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(authenticatedConn, {
      body: {
        page: 1,
        limit: 20,
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(result);
  TestValidator.predicate(
    "authenticated request returns valid page response with pagination",
    result.pagination !== null && result.pagination !== undefined,
  );
  TestValidator.predicate(
    "response contains todo data array",
    Array.isArray(result.data),
  );
}
