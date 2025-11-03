import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTask";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test retrieving detailed information about a specific todo user by their
 * UUID. This validates the user profile retrieval functionality by creating a
 * user account, establishing activity through task creation, and then fetching
 * complete user details to ensure proper data integrity and access control.
 */
export async function test_api_user_profile_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userRegistration = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "testPassword123",
    } satisfies ITodoUser.IJoin,
  });
  typia.assert(userRegistration);

  // Step 2: Create a todo task to establish user activity in the system
  const taskCreation = await api.functional.todo.user.todo.tasks.create(
    connection,
    {
      body: {
        description: RandomGenerator.paragraph({ sentences: 5 }),
        href: "https://example.com/todo",
        referrer: "https://example.com",
      } satisfies ITodoTask.ICreate,
    },
  );
  typia.assert(taskCreation);

  TestValidator.equals(
    "task belongs to current user",
    taskCreation.user.id,
    userRegistration.id,
  );

  // Step 3: Retrieve the user's profile using user ID
  const userProfile = await api.functional.todo.user.users.at(connection, {
    userId: userRegistration.id,
  });
  typia.assert(userProfile);

  // Step 4: Validate retrieved profile contains all expected user data
  TestValidator.equals("user ID matches", userProfile.id, userRegistration.id);
  TestValidator.equals("user email matches", userProfile.email, userEmail);
  TestValidator.predicate(
    "creation timestamp exists",
    userProfile.created_at !== undefined,
  );
  TestValidator.predicate(
    "update timestamp exists",
    userProfile.updated_at !== undefined,
  );
  TestValidator.predicate(
    "MFA status exists",
    userProfile.mfa_enabled !== undefined,
  );
  TestValidator.predicate(
    "failed login attempts positive",
    userProfile.failed_login_attempts >= 0,
  );
  TestValidator.predicate(
    "lockout status exists",
    userProfile.locked_until !== undefined,
  );

  // Step 5: Verify task count reflects created task
  TestValidator.equals("task count equals 1", userProfile.tasks_count, 1);

  // Step 6: Validate task association and business status
  TestValidator.predicate(
    "task has valid business status",
    taskCreation.business_status === "pending" ||
      taskCreation.business_status === "processing" ||
      taskCreation.business_status === "completed",
  );
  TestValidator.predicate(
    "task completion status valid",
    typeof taskCreation.completed === "boolean",
  );
  TestValidator.predicate(
    "task timestamps exist",
    taskCreation.created_at !== undefined &&
      taskCreation.updated_at !== undefined,
  );
}
