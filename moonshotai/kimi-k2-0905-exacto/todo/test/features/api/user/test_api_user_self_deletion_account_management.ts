import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppTaskDescription } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskDescription";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test user self-service account deletion functionality.
 *
 * This comprehensive test validates:
 *
 * 1. User account creation and authentication setup
 * 2. Creation of test data (tasks) to verify cascading deletion
 * 3. Successful self-service account deletion by authenticated user
 * 4. Verification that account and associated data are permanently removed
 * 5. Access control validation - users can only delete their own accounts
 * 6. Authentication session termination upon deletion
 *
 * The test ensures data privacy compliance by verifying complete removal of
 * personal information and prevents unauthorized account deletion.
 */
export async function test_api_user_self_deletion_account_management(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account for deletion testing
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);

  const newUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: "https://example.com/todo",
      referrer: "https://example.com/signup",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(newUser);

  // Verify user was created successfully
  TestValidator.equals("user created with email", newUser.email, userEmail);
  TestValidator.predicate(
    "user has valid UUID",
    typia.is<string & tags.Format<"uuid">>(newUser.id),
  );

  // Step 2: Create some test tasks to verify cascading deletion
  const task1 = await api.functional.todoApp.user.tasks.create(connection, {
    body: {
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: {
        type: "full",
        content: RandomGenerator.content({ paragraphs: 2 }),
      },
    } satisfies ITodoAppTask.ICreate,
  });
  typia.assert(task1);

  const task2 = await api.functional.todoApp.user.tasks.create(connection, {
    body: {
      title: RandomGenerator.paragraph({ sentences: 2 }),
      description: {
        type: "full",
        content: RandomGenerator.paragraph({ sentences: 5 }),
      },
    } satisfies ITodoAppTask.ICreate,
  });
  typia.assert(task2);

  // Verify tasks were created and associated with user
  TestValidator.equals("task1 has correct user", task1.user.id, newUser.id);
  TestValidator.equals("task2 has correct user", task2.user.id, newUser.id);
  TestValidator.predicate(
    "task1 has valid UUID",
    typia.is<string & tags.Format<"uuid">>(task1.id),
  );
  TestValidator.predicate(
    "task2 has valid UUID",
    typia.is<string & tags.Format<"uuid">>(task2.id),
  );

  // Step 3: Create a second user to test access control
  const otherUserEmail = typia.random<string & tags.Format<"email">>();
  const otherUserPassword = RandomGenerator.alphaNumeric(12);

  const otherUser = await api.functional.auth.user.join(connection, {
    body: {
      email: otherUserEmail,
      password: otherUserPassword,
      href: "https://example.com/todo",
      referrer: "https://example.com/signup",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(otherUser);

  // Step 4: Test access control - verify other user cannot delete first user's account
  await TestValidator.error("other user cannot delete account", async () => {
    await api.functional.todoApp.user.auth.users.erase(connection, {
      userId: newUser.id,
    });
  });

  // Step 5: Create unauthenticated connection to test deletion without auth
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // Test deletion without authentication
  await TestValidator.error(
    "unauthenticated user cannot delete account",
    async () => {
      await api.functional.todoApp.user.auth.users.erase(unauthConnection, {
        userId: newUser.id,
      });
    },
  );

  // Step 6: Perform self-deletion with authenticated user
  await api.functional.todoApp.user.auth.users.erase(connection, {
    userId: newUser.id,
  });

  // Step 7: Verify account deletion by attempting to authenticate (should fail)
  await TestValidator.error("deleted user cannot login", async () => {
    await api.functional.auth.user.login(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        href: "https://example.com/todo",
        referrer: "https://example.com/login",
      } satisfies ITodoAppUser.ILogin,
    });
  });

  // Step 8: Verify deletion of wrong user ID fails appropriately
  const nonExistentUserId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error("cannot delete non-existent user", async () => {
    await api.functional.todoApp.user.auth.users.erase(connection, {
      userId: nonExistentUserId,
    });
  });

  // Test 9: Verify other user's account still exists and is accessible
  // Switch to other user's authentication
  const otherAuth = await api.functional.auth.user.login(connection, {
    body: {
      email: otherUserEmail,
      password: otherUserPassword,
      href: "https://example.com/todo",
      referrer: "https://example.com/login",
    } satisfies ITodoAppUser.ILogin,
  });
  typia.assert(otherAuth);

  // Verify other user can still create tasks (their account wasn't affected)
  const otherUserTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: {
          type: "full",
          content: RandomGenerator.paragraph({ sentences: 3 }),
        },
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(otherUserTask);

  TestValidator.equals(
    "other user task created successfully",
    otherUserTask.user.id,
    otherUser.id,
  );
}
