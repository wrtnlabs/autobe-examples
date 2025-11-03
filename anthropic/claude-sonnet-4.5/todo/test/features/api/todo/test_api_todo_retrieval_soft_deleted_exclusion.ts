import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that retrieving a soft-deleted todo item returns a not found error.
 *
 * This test validates that todos with non-null deleted_at timestamps are
 * treated as non-existent for retrieval purposes, maintaining consistency with
 * the soft delete pattern. The test creates a user account, creates a todo
 * item, soft deletes it, then attempts to retrieve it by ID to verify that the
 * system returns an appropriate not found error rather than exposing the
 * deleted data.
 *
 * Steps:
 *
 * 1. Create a new user account for authentication context
 * 2. Create a todo item for testing
 * 3. Soft delete the todo item
 * 4. Attempt to retrieve the soft-deleted todo
 * 5. Verify error is returned (not found)
 */
export async function test_api_todo_retrieval_soft_deleted_exclusion(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account for authentication
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.IRegister,
    },
  );
  typia.assert(user);

  // Step 2: Create a todo item that will be soft deleted
  const todo: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        status: "incomplete",
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(todo);

  // Step 3: Soft delete the todo item
  const deletedTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.erase(connection, {
      todoId: todo.id,
    });
  typia.assert(deletedTodo);

  // Step 4: Attempt to retrieve the soft-deleted todo and expect an error
  await TestValidator.error(
    "retrieving soft-deleted todo should fail with not found error",
    async () => {
      await api.functional.todoList.user.todos.at(connection, {
        todoId: todo.id,
      });
    },
  );
}
