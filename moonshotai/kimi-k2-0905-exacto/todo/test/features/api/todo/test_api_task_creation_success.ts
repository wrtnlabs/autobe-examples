import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTask";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test successful task creation workflow for authenticated users.
 *
 * This comprehensive test validates the complete task creation process:
 *
 * 1. User registration to create a new account
 * 2. Authentication establishment through the registration response
 * 3. Task creation with proper description validation
 * 4. Verification of task defaults (pending business status, incomplete completion
 *    status)
 * 5. Confirmation of proper user association with the created task
 *
 * The test ensures that the task creation endpoint correctly accepts valid task
 * data, assigns appropriate default values, and associates the task with the
 * authenticated user. It verifies the integration between user authentication
 * and task management systems.
 */
export async function test_api_task_creation_success(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account
  const email = typia.random<string & tags.Format<"email">>();
  const password = "securePassword123";

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password,
    } satisfies ITodoUser.IJoin,
  });
  typia.assert(user);

  TestValidator.equals(
    "user email matches registration email",
    user.email,
    email,
  );
  TestValidator.equals("user has zero initial tasks", user.tasks_count, 0);
  TestValidator.predicate("user has valid UUID", user.id.length > 0);
  TestValidator.predicate(
    "user token is provided",
    user.token.access.length > 0,
  );

  // Connection automatically includes JWT token from registration
  TestValidator.predicate(
    "authentication token exists",
    connection.headers?.Authorization !== undefined,
  );

  // Step 2: Create a task with valid description
  const taskDescription = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });

  const task = await api.functional.todo.user.todo.tasks.create(connection, {
    body: {
      description: taskDescription,
      href: "https://example.com/app",
      referrer: "https://example.com",
    } satisfies ITodoTask.ICreate,
  });
  typia.assert(task);

  // Step 3: Validate task creation and default values
  TestValidator.equals(
    "task description matches input",
    task.description,
    taskDescription,
  );
  TestValidator.equals("task completed status is false", task.completed, false);
  TestValidator.equals(
    "task business status is pending",
    task.business_status,
    "pending",
  );
  TestValidator.predicate("task has valid UUID", task.id.length > 0);
  TestValidator.predicate(
    "task has creation timestamp",
    task.created_at.length > 0,
  );
  TestValidator.predicate(
    "task has update timestamp",
    task.updated_at.length > 0,
  );

  // Step 4: Verify user association
  TestValidator.equals(
    "task user ID matches authenticated user",
    task.user.id,
    user.id,
  );
  TestValidator.equals(
    "task user email matches authenticated user",
    task.user.email,
    user.email,
  );
  TestValidator.equals(
    "task user mfa_enabled status matches",
    task.user.mfa_enabled,
    user.mfa_enabled,
  );
  TestValidator.equals(
    "task user tasks_count matches",
    task.user.tasks_count,
    user.tasks_count,
  );

  // Step 5: Validate optional fields (completed_at should be null for new tasks)
  TestValidator.equals(
    "new task has no completion timestamp",
    task.completed_at,
    null,
  );

  // Step 6: Verify task description validation (exactly 500 characters at maximum)
  const maxDescription = RandomGenerator.alphabets(500);

  const maxTask = await api.functional.todo.user.todo.tasks.create(connection, {
    body: {
      description: maxDescription,
      href: "https://example.com/app",
      referrer: "https://example.com",
    } satisfies ITodoTask.ICreate,
  });
  typia.assert(maxTask);

  TestValidator.equals(
    "max description task description matches input",
    maxTask.description,
    maxDescription,
  );
  TestValidator.equals(
    "max description length is exactly 500",
    maxTask.description.length,
    500,
  );
}
