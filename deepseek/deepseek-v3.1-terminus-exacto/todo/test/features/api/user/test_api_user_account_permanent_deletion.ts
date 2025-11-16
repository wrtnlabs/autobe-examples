import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";

/**
 * Test comprehensive user account deletion workflow that permanently removes a
 * user and all associated data.
 *
 * This test validates the permanent deletion functionality by:
 *
 * 1. Creating a new user account and authenticating it
 * 2. Creating sample todo items to establish data dependencies
 * 3. Testing authorization by attempting to delete another user's account
 * 4. Performing permanent deletion of the authenticated user's account
 * 5. Verifying that the user account and associated data are properly cleaned up
 * 6. Ensuring proper error handling for unauthorized operations
 */
export async function test_api_user_account_permanent_deletion(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate first user account
  const user1Email = typia.random<string & tags.Format<"email">>();
  const user1Password = "testPassword123";

  const user1 = await api.functional.auth.user.join(connection, {
    body: {
      email: user1Email,
      password: user1Password,
      password_hash: user1Password,
      status: "active" as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user1);

  // Step 2: Create todo items for first user
  const user1Todos = await ArrayUtil.asyncRepeat(2, async (index) => {
    const todo = await api.functional.todoApp.user.todos.create(connection, {
      body: {
        title: `User1 Todo ${index + 1}`,
        description: `Description for user1 todo ${index + 1}`,
        due_date: new Date(Date.now() + 86400000 * (index + 1)).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    });
    typia.assert(todo);
    return todo;
  });

  TestValidator.equals("user1 should have 2 todo items", user1Todos.length, 2);

  // Step 3: Create second user account for authorization testing
  const user2Email = typia.random<string & tags.Format<"email">>();
  const user2Password = "testPassword456";

  const user2 = await api.functional.auth.user.join(connection, {
    body: {
      email: user2Email,
      password: user2Password,
      password_hash: user2Password,
      status: "active" as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user2);

  // Step 4: Test authorization - user2 should not be able to delete user1's account
  await TestValidator.error(
    "user2 should not be able to delete user1's account",
    async () => {
      await api.functional.todoApp.user.users.erase(connection, {
        userId: user1.id,
      });
    },
  );

  // Step 5: User2 should be able to delete their own account
  await api.functional.todoApp.user.users.erase(connection, {
    userId: user2.id,
  });

  // Step 6: Verify user2 deletion - subsequent operations should fail
  await TestValidator.error(
    "should not allow operations after user2 deletion",
    async () => {
      await api.functional.todoApp.user.todos.create(connection, {
        body: {
          title: "Should fail after user2 deletion",
          description: "This should not be created",
        } satisfies ITodoAppTodo.ICreate,
      });
    },
  );

  // Step 7: User1 should still be able to operate (user1 is still active)
  const additionalTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: "User1 additional todo after user2 deletion",
        description: "User1 should still be able to create todos",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(additionalTodo);

  // Step 8: Finally, delete user1's account
  await api.functional.todoApp.user.users.erase(connection, {
    userId: user1.id,
  });

  // Step 9: Verify complete cleanup - no operations should work after both users deleted
  await TestValidator.error(
    "should not allow any operations after all users deleted",
    async () => {
      await api.functional.todoApp.user.todos.create(connection, {
        body: {
          title: "Should fail completely",
          description: "No users should exist now",
        } satisfies ITodoAppTodo.ICreate,
      });
    },
  );

  // Step 10: Test that we cannot delete already deleted users
  await TestValidator.error(
    "should not allow deleting already deleted user",
    async () => {
      await api.functional.todoApp.user.users.erase(connection, {
        userId: user1.id,
      });
    },
  );

  await TestValidator.error(
    "should not allow deleting non-existent user",
    async () => {
      await api.functional.todoApp.user.users.erase(connection, {
        userId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
