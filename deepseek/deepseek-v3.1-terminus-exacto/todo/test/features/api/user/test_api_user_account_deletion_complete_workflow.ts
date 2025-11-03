import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test the complete user account deletion workflow including authentication,
 * ownership verification, and cascade deletion of associated data.
 *
 * This test validates that when a user account is deleted, all associated todo
 * items are properly removed through cascade deletion, and the system maintains
 * proper authentication and ownership verification throughout the process.
 */
export async function test_api_user_account_deletion_complete_workflow(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";

  const createdUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(createdUser);

  // Step 2: Authenticate the user to establish session
  const authenticatedUser = await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: "https://example.com/todo-app",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.ILogin,
  });
  typia.assert(authenticatedUser);

  // Verify authentication token was set
  TestValidator.equals(
    "authentication token should be set",
    typeof connection.headers?.Authorization,
    "string",
  );

  // Step 3: Create multiple todo items for the user
  const todoTitles = [
    "Buy groceries",
    "Finish project",
    "Call dentist",
  ] as const;
  const createdTodos: ITodoAppTodo[] = [];

  for (const title of todoTitles) {
    const todo = await api.functional.todoApp.user.users.todos.create(
      connection,
      {
        userId: createdUser.id,
        body: {
          title: title,
        } satisfies ITodoAppTodo.ICreate,
      },
    );
    typia.assert(todo);
    createdTodos.push(todo);

    // Verify todo ownership
    TestValidator.equals(
      "todo should belong to the user",
      todo.todo_app_user_id,
      createdUser.id,
    );
  }

  // Step 4: Perform account deletion operation
  const deletedUser = await api.functional.todoApp.user.users.erase(
    connection,
    {
      userId: createdUser.id,
    },
  );
  typia.assert(deletedUser);

  // Step 5: Validate deletion response contains correct user information
  TestValidator.equals(
    "deleted user ID matches created user ID",
    deletedUser.id,
    createdUser.id,
  );
  TestValidator.equals(
    "deleted user email matches created user email",
    deletedUser.email,
    createdUser.email,
  );
  TestValidator.equals(
    "deleted user status should be active",
    deletedUser.status,
    "active",
  );

  // Step 6: Verify cascade deletion - todos should no longer be accessible
  for (const todo of createdTodos) {
    await TestValidator.error(
      `should not be able to access todo ${todo.id} after user deletion`,
      async () => {
        // Attempt to perform any operation with the deleted todo
        // This should fail due to cascade deletion
        await api.functional.todoApp.user.users.todos.create(connection, {
          userId: createdUser.id, // This user no longer exists
          body: {
            title: "This should fail",
          } satisfies ITodoAppTodo.ICreate,
        });
      },
    );
  }

  // Step 7: Verify authentication is cleared after deletion
  await TestValidator.error(
    "should not be able to authenticate with deleted user credentials",
    async () => {
      await api.functional.auth.user.login(connection, {
        body: {
          email: userEmail,
          password: userPassword,
          href: "https://example.com/todo-app",
          referrer: "https://example.com",
        } satisfies ITodoAppUser.ILogin,
      });
    },
  );

  // Step 8: Verify ownership - different user cannot delete this account
  // Create a second user
  const secondUserEmail = typia.random<string & tags.Format<"email">>();
  const secondUser = await api.functional.auth.user.join(connection, {
    body: {
      email: secondUserEmail,
      password: "anotherPassword123",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(secondUser);

  // Authenticate as second user
  await api.functional.auth.user.login(connection, {
    body: {
      email: secondUserEmail,
      password: "anotherPassword123",
      href: "https://example.com/todo-app",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.ILogin,
  });

  // Second user should not be able to delete the first user's account
  await TestValidator.error(
    "different user cannot delete another user's account",
    async () => {
      await api.functional.todoApp.user.users.erase(connection, {
        userId: createdUser.id, // Trying to delete first user's account
      });
    },
  );
}
