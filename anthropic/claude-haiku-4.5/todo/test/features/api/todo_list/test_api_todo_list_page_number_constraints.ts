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
 * Test pagination page parameter constraints for todo list API.
 *
 * Validates that the page parameter in PATCH /todoList/user/todos endpoint
 * properly enforces pagination boundaries. Page numbers must be minimum 1, with
 * page 0 and negative numbers being invalid. Tests both valid and invalid page
 * number scenarios to ensure proper constraint handling.
 *
 * Testing approach:
 *
 * 1. Create user account for authenticated todo list access
 * 2. Test valid page=1 (minimum valid page number)
 * 3. Test invalid page=0 (boundary constraint violation)
 * 4. Test invalid negative page numbers (business rule violation)
 * 5. Test page beyond total pages (graceful boundary handling)
 * 6. Verify pagination metadata correctness
 */
export async function test_api_todo_list_page_number_constraints(
  connection: api.IConnection,
) {
  // 1. Create user account for authenticated access
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "SecurePassword123",
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // 2. Test valid page=1 (minimum valid page number - should succeed)
  const validPageResult: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        page: 1,
        limit: 20,
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(validPageResult);
  TestValidator.equals(
    "page 1 should be returned with current pagination value",
    validPageResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination should have valid limit",
    validPageResult.pagination.limit > 0,
  );

  // 3. Test invalid page=0 (boundary violation - should fail)
  await TestValidator.error(
    "page 0 should fail validation as it violates minimum constraint",
    async () => {
      await api.functional.todoList.user.todos.index(connection, {
        body: {
          page: 0,
          limit: 20,
        } satisfies ITodoListTodo.IRequest,
      });
    },
  );

  // 4. Test negative page numbers (business rule violation - should fail)
  await TestValidator.error(
    "negative page number should fail validation",
    async () => {
      await api.functional.todoList.user.todos.index(connection, {
        body: {
          page: -1,
          limit: 20,
        } satisfies ITodoListTodo.IRequest,
      });
    },
  );

  // 5. Test page beyond total pages (should handle gracefully)
  const largePageResult: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        page: 9999,
        limit: 20,
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(largePageResult);
  TestValidator.predicate(
    "large page number should return valid pagination response",
    largePageResult.pagination.current >= 1,
  );

  // 6. Verify pagination metadata is correct
  TestValidator.predicate(
    "pagination current page should be at least 1",
    validPageResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    validPageResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count should be non-negative",
    validPageResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count should be non-negative",
    validPageResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data array should be present in response",
    Array.isArray(validPageResult.data),
  );
}
