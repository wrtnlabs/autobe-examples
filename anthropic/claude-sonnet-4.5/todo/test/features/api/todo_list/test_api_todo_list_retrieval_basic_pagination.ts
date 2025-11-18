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
 * Test basic todo list retrieval with default pagination settings.
 *
 * This test validates the fundamental list retrieval functionality with
 * standard pagination parameters. It creates a user account, populates their
 * todo list with multiple items, and then retrieves the first page of results
 * to verify pagination metadata and data integrity.
 *
 * Test flow:
 *
 * 1. Register a new user account and authenticate
 * 2. Create multiple todo items (15 items to test pagination across multiple
 *    pages)
 * 3. Retrieve the first page with limit=10
 * 4. Validate pagination metadata (current page, limit, total records, total
 *    pages)
 * 5. Verify todo items contain all required fields through typia.assert validation
 */
export async function test_api_todo_list_retrieval_basic_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = typia.random<string & tags.MinLength<8>>();

  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: userPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create multiple todo items to test pagination
  const todoCount = 15;
  const createdTodos: ITodoListTodo[] = await ArrayUtil.asyncRepeat(
    todoCount,
    async (index) => {
      const todo: ITodoListTodo =
        await api.functional.todoList.user.todos.create(connection, {
          body: {
            title: `${RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 7 })} - Item ${index + 1}`,
          } satisfies ITodoListTodo.ICreate,
        });
      typia.assert(todo);
      return todo;
    },
  );

  // Step 3: Retrieve first page with pagination parameters
  const pageRequest = {
    page: 1,
    limit: 10,
  } satisfies ITodoListTodo.IRequest;

  const pageResult: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: pageRequest,
    });
  typia.assert(pageResult);

  // Step 4: Validate pagination metadata
  TestValidator.equals(
    "current page should be 1",
    pageResult.pagination.current,
    1,
  );

  TestValidator.equals("limit should be 10", pageResult.pagination.limit, 10);

  TestValidator.equals(
    "total records should match created todos",
    pageResult.pagination.records,
    todoCount,
  );

  TestValidator.equals(
    "total pages should be 2",
    pageResult.pagination.pages,
    2,
  );

  // Step 5: Validate returned todo items count
  TestValidator.equals(
    "returned items count should be 10",
    pageResult.data.length,
    10,
  );
}
