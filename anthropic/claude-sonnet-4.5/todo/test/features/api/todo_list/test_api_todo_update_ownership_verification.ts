import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that users cannot update todos belonging to other users.
 *
 * This test validates the ownership verification mechanism for todo updates. It
 * creates two separate user accounts (User A and User B), has User A create a
 * todo item, then attempts to update that todo while authenticated as User B.
 * The test expects the update operation to fail with an authorization error,
 * ensuring the system properly enforces ownership boundaries and prevents
 * unauthorized access to other users' todos.
 *
 * Steps:
 *
 * 1. Create and authenticate as User A
 * 2. User A creates a todo item
 * 3. Create and authenticate as User B (switching context)
 * 4. User B attempts to update User A's todo
 * 5. Verify that the update fails with an authorization error
 */
export async function test_api_todo_update_ownership_verification(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as User A
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

  // Verify the todo was created with correct ownership
  TestValidator.equals(
    "todo owner should be User A",
    userATodo.todo_list_user_id,
    userA.id,
  );
  TestValidator.equals("todo title should match", userATodo.title, todoTitle);

  // Step 3: Create and authenticate as User B (this switches the authentication context)
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

  // Verify User B is a different user
  TestValidator.notEquals(
    "User B should be different from User A",
    userB.id,
    userA.id,
  );

  // Step 4 & 5: User B attempts to update User A's todo - this should fail
  await TestValidator.error("User B cannot update User A's todo", async () => {
    await api.functional.todoList.user.todos.update(connection, {
      todoId: userATodo.id,
      body: {
        title: "Unauthorized modification attempt",
        completed: true,
      } satisfies ITodoListTodo.IUpdate,
    });
  });
}
