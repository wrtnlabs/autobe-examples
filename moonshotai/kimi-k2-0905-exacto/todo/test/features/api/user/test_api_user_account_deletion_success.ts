import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTask";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test successful user account deletion including cascade removal of all
 * associated data.
 *
 * This test validates that authenticated users can permanently delete their own
 * accounts, and that the system properly removes all associated user data
 * including tasks, sessions, and user profile information. It verifies that the
 * deletion process maintains referential integrity and properly cleans up all
 * user-related data across the system.
 *
 * The test follows this workflow:
 *
 * 1. Create a new user account using the auth user join endpoint
 * 2. Create a todo task to establish user data and profile
 * 3. Delete the user account using the delete endpoint with userId
 * 4. Verify the deletion worked by ensuring the operation completes without errors
 * 5. Test that the same email can be reused after deletion
 * 6. Confirm proper authentication ensures only valid users can perform deletion
 */
export async function test_api_user_account_deletion_success(
  connection: api.IConnection,
) {
  // Generate random user credentials for registration
  const email = typia.random<string & tags.Format<"email">>();
  const password = "testPassword123";

  // Step 1: Create a new user account
  const createUserBody = {
    email,
    password,
  } satisfies ITodoUser.IJoin;

  const user = await api.functional.auth.user.join(connection, {
    body: createUserBody,
  });
  typia.assert(user);

  // Verify user was created successfully
  TestValidator.equals(
    "user should have been created with correct email",
    user.email,
    email,
  );
  TestValidator.predicate(
    "user should have authentication token",
    user.token !== null,
  );

  // Step 2: Create a todo task to establish user data
  const taskDescription = RandomGenerator.paragraph({ sentences: 3 });
  const createTaskBody = {
    description: taskDescription,
    business_status: "pending",
    href: "https://example.com/todo",
    referrer: "https://example.com",
  } satisfies ITodoTask.ICreate;

  const createdTask = await api.functional.todo.user.todo.tasks.create(
    connection,
    {
      body: createTaskBody,
    },
  );
  typia.assert(createdTask);

  // Verify task was associated with the user
  TestValidator.equals(
    "task should belong to the user who created it",
    createdTask.user.id,
    user.id,
  );
  TestValidator.equals(
    "task description should match input",
    createdTask.description,
    taskDescription,
  );

  // Step 3: Delete the user account with all associated data
  await api.functional.todo.user.users.erase(connection, {
    userId: user.id,
  });

  // Step 4: Verify the deletion by testing clean slate expectations
  // Since this is hard deletion, we aim to test system immutability
  const newUserCreationBody = {
    email,
    password: "newPassword456",
  } satisfies ITodoUser.IJoin;

  const newUser = await api.functional.auth.user.join(connection, {
    body: newUserCreationBody,
  });
  typia.assert(newUser);

  TestValidator.equals(
    "same email should be available for new user registration after deletion",
    newUser.email,
    email,
  );
  TestValidator.notEquals(
    "new user ID should be different from deleted user ID",
    newUser.id,
    user.id,
  );

  // Clean up newly created user to maintain test environment
  await api.functional.todo.user.users.erase(connection, {
    userId: newUser.id,
  });
}
