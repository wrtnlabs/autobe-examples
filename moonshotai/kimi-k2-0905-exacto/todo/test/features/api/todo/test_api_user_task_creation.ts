import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTask";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test complete task creation workflow including user registration and task
 * management.
 *
 * This test validates the entire flow of creating a new user account and then
 * creating a task under that user's account. It verifies:
 *
 * 1. User registration process with email and password
 * 2. Authentication and session establishment
 * 3. Task creation with meaningful description
 * 4. Proper initial state validation (pending status, incomplete)
 * 5. System-generated fields in response (timestamps, IDs)
 * 6. User-task association integrity
 *
 * The test ensures the task creation API properly initializes tasks with the
 * correct business workflow status and maintains proper user ownership through
 * the session.
 */
export async function test_api_user_task_creation(connection: api.IConnection) {
  // Step 1: Create new user account for task creation
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(10);

  const user: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies ITodoUser.IJoin,
    },
  );
  typia.assert(user);

  // Validate user was created with expected initial state
  TestValidator.predicate(
    "user has valid ID",
    user.id !== null && user.id !== undefined,
  );
  TestValidator.predicate("user email matches input", user.email === userEmail);
  TestValidator.equals("MFA disabled by default", user.mfa_enabled, false);
  TestValidator.equals(
    "no failed login attempts",
    user.failed_login_attempts,
    0,
  );
  TestValidator.predicate(
    "user has zero tasks initially",
    user.tasks_count === 0,
  );
  TestValidator.predicate(
    "user has valid timestamps",
    user.created_at !== null &&
      user.created_at !== undefined &&
      user.updated_at !== null &&
      user.updated_at !== undefined,
  );

  // Store original task count to verify increment
  const originalTaskCount = user.tasks_count;

  // Step 2: Create task with meaningful description
  const taskDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 8,
  });
  const currentHref = "http://localhost:3000/tasks";
  const currentReferrer = "http://localhost:3000/dashboard";

  const createdTask: ITodoTask = await api.functional.todo.user.tasks.create(
    connection,
    {
      body: {
        description: taskDescription,
        business_status: "pending",
        href: currentHref,
        referrer: currentReferrer,
      } satisfies ITodoTask.ICreate,
    },
  );
  typia.assert(createdTask);

  // Step 3: Validate task creation response
  TestValidator.predicate(
    "task has valid UUID",
    createdTask.id !== null && createdTask.id !== undefined,
  );
  TestValidator.equals(
    "task description matches input",
    createdTask.description,
    taskDescription,
  );
  TestValidator.equals("task is incomplete", createdTask.completed, false);
  TestValidator.equals(
    "business status is pending",
    createdTask.business_status,
    "pending",
  );
  TestValidator.predicate(
    "task has creation timestamp",
    createdTask.created_at !== null && createdTask.created_at !== undefined,
  );
  TestValidator.predicate(
    "task has update timestamp",
    createdTask.updated_at !== null && createdTask.updated_at !== undefined,
  );
  TestValidator.equals("task not completed", createdTask.completed_at, null);

  // Validate user association
  TestValidator.equals(
    "task assigned to correct user",
    createdTask.user.id,
    user.id,
  );
  TestValidator.equals(
    "task user email matches",
    createdTask.user.email,
    user.email,
  );
  TestValidator.equals(
    "task user MFA status matches",
    createdTask.user.mfa_enabled,
    user.mfa_enabled,
  );
  TestValidator.equals(
    "task user task count incremented",
    createdTask.user.tasks_count,
    originalTaskCount + 1,
  );

  // Step 4: Validate system-generated fields match expected patterns
  const createdAt = new Date(createdTask.created_at);
  const updatedAt = new Date(createdTask.updated_at);
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(createdAt.getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid date",
    !isNaN(updatedAt.getTime()),
  );
  TestValidator.predicate(
    "timestamps are recent",
    createdAt <= updatedAt &&
      updatedAt <= new Date() &&
      updatedAt >= new Date(Date.now() - 5000), // Within last 5 seconds
  );

  // Step 5: Test task creation with different business status
  const secondTaskDescription = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 6,
  });
  const secondTask: ITodoTask = await api.functional.todo.user.tasks.create(
    connection,
    {
      body: {
        description: secondTaskDescription,
        href: currentHref,
        referrer: currentReferrer,
      } satisfies ITodoTask.ICreate,
    },
  );
  typia.assert(secondTask);

  // Validate second task also defaults to pending status
  TestValidator.equals(
    "second task defaults to pending",
    secondTask.business_status,
    "pending",
  );
  TestValidator.equals(
    "second task is incomplete",
    secondTask.completed,
    false,
  );
  TestValidator.predicate(
    "user task count incremented again",
    secondTask.user.tasks_count === createdTask.user.tasks_count + 1,
  );
}
