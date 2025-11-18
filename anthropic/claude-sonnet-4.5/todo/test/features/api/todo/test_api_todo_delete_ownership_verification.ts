import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that users cannot delete todos belonging to other users.
 *
 * This test validates a critical security requirement: proper ownership
 * verification for todo deletion operations. It ensures that the API correctly
 * enforces authorization boundaries and prevents users from deleting todo items
 * they don't own.
 *
 * Test workflow:
 *
 * 1. Create and authenticate as User A (todo owner)
 * 2. User A creates a todo item
 * 3. Create and authenticate as User B (unauthorized user)
 * 4. User B attempts to delete User A's todo
 * 5. Verify the deletion attempt fails with an authorization error
 *
 * This test ensures data security, prevents unauthorized data manipulation, and
 * validates that multi-tenant data isolation is properly enforced at the API
 * level.
 */
export async function test_api_todo_delete_ownership_verification(
  connection: api.IConnection,
) {
  // Step 1: Create User A (todo owner)
  const userAEmail = typia.random<string & tags.Format<"email">>();
  const userAPassword = typia.random<string & tags.MinLength<8>>();

  const userA = await api.functional.auth.user.join(connection, {
    body: {
      email: userAEmail,
      password: userAPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(userA);

  // Step 2: User A creates a todo item
  const todoTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const userATodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: todoTitle,
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(userATodo);

  // Verify the todo was created successfully
  TestValidator.equals("todo created by user A", userATodo.title, todoTitle);
  TestValidator.equals(
    "todo owner is user A",
    userATodo.todo_list_user_id,
    userA.id,
  );

  // Step 3: Create User B (unauthorized user)
  const userBEmail = typia.random<string & tags.Format<"email">>();
  const userBPassword = typia.random<string & tags.MinLength<8>>();

  const userB = await api.functional.auth.user.join(connection, {
    body: {
      email: userBEmail,
      password: userBPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(userB);

  // Step 4: User B attempts to delete User A's todo (should fail)
  await TestValidator.error("user B cannot delete user A's todo", async () => {
    await api.functional.todoList.user.todos.erase(connection, {
      todoId: userATodo.id,
    });
  });
}
