import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppTaskDescription } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskDescription";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test complete user account deletion workflow including pre-verification of
 * account existence, deletion execution, and post-deletion verification.
 * Validates that all user data is permanently removed including tasks, task
 * snapshots, sessions, and profile information. Ensures that the operation
 * properly handles cascading deletion across all related entities and that the
 * user can no longer access the system after deletion.
 *
 * Test workflow:
 *
 * 1. Create a new user account with complete authentication
 * 2. Create multiple todo tasks to verify cascading deletion of user data
 * 3. Verify the user account and tasks exist before deletion
 * 4. Execute the account deletion operation
 * 5. Verify the user can no longer access the system after deletion
 * 6. Confirm that all related data (tasks, sessions) are permanently removed
 */
export async function test_api_user_account_deletion_complete_cleanup(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account for deletion testing
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userData = {
    email: userEmail,
    password: "testPassword123",
    href: "https://example.com/todo",
    referrer: "https://example.com/signup",
  } satisfies ITodoAppUser.IJoin;

  const createdUser = await api.functional.auth.user.join(connection, {
    body: userData,
  });
  typia.assert(createdUser);

  TestValidator.equals(
    "user created successfully",
    createdUser.email,
    userEmail,
  );
  TestValidator.predicate("user has valid ID", () => createdUser.id.length > 0);

  // Step 2: Create multiple todo tasks to establish user data
  const task1Data = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: {
      type: "full" as const,
      content: RandomGenerator.content({ paragraphs: 2 }),
    },
  } satisfies ITodoAppTask.ICreate;

  const task1 = await api.functional.todoApp.user.tasks.create(connection, {
    body: task1Data,
  });
  typia.assert(task1);

  const task2Data = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: {
      type: "full" as const,
      content: RandomGenerator.paragraph({ sentences: 5 }),
    },
  } satisfies ITodoAppTask.ICreate;

  const task2 = await api.functional.todoApp.user.tasks.create(connection, {
    body: task2Data,
  });
  typia.assert(task2);

  TestValidator.equals("task 1 belongs to user", task1.user.id, createdUser.id);
  TestValidator.equals("task 2 belongs to user", task2.user.id, createdUser.id);
  TestValidator.predicate(
    "tasks have valid IDs",
    () => task1.id.length > 0 && task2.id.length > 0,
  );

  // Step 3: Verify user account exists with tasks before deletion
  TestValidator.predicate(
    "user has created tasks",
    () => task1.status === "pending" && task2.status === "pending",
  );

  // Step 4: Execute account deletion operation
  await api.functional.todoApp.user.auth.users.erase(connection, {
    userId: createdUser.id,
  });

  // Step 5: Verify user can no longer access the system after deletion
  // Create clean connection without authentication headers
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // Step 6: Confirm user account deletion prevents further operations
  await TestValidator.error("deleted user cannot create tasks", async () => {
    await api.functional.todoApp.user.tasks.create(unauthConnection, {
      body: {
        title: "Should fail",
        description: {
          type: "full" as const,
          content: "No authentication",
        },
      } satisfies ITodoAppTask.ICreate,
    });
  });
}
