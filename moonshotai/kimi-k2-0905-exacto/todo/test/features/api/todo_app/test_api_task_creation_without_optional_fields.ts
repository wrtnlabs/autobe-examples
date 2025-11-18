import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test minimal task creation with only required fields to ensure proper
 * validation and default value handling.
 *
 * This test validates that tasks can be created successfully with only the
 * essential information:
 *
 * - Title: Required field describing the task
 * - Status: Required field indicating task state (pending/completed)
 *
 * It also verifies that the system correctly handles optional fields:
 *
 * - Priority: Defaults to medium when not specified
 * - Description: Optional and can be null
 * - Due date: Optional and can be null for non-time-sensitive tasks
 * - User ID: Optional as it defaults to the authenticated user
 *
 * The test follows these steps:
 *
 * 1. Create a new user account for authentication
 * 2. Create a minimal task with only title and status
 * 3. Validate that the task was created with appropriate defaults
 * 4. Verify that optional fields are properly handled (null or default values)
 * 5. Ensure proper UUID formatting for task and user IDs
 */
export async function test_api_task_creation_without_optional_fields(
  connection: api.IConnection,
) {
  // Step 1: Create new user account for authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "secure1234",
      name: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create minimal task with only required fields
  const minimalTaskBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }), // Generate a descriptive title
    status: "pending",
  } satisfies ITodoAppTask.ICreate;

  const task = await api.functional.todoApp.user.users.tasks.create(
    connection,
    {
      userId: user.id,
      body: minimalTaskBody,
    },
  );
  typia.assert(task);

  // Step 3: Validate task creation with appropriate defaults
  TestValidator.equals(
    "Task title matches input title",
    task.title,
    minimalTaskBody.title,
  );
  TestValidator.equals(
    "Task status matches input status",
    task.status,
    minimalTaskBody.status,
  );
  TestValidator.equals("Task user reference matches", task.user.id, user.id);

  // Step 4: Verify optional fields are properly handled
  // Priority should default to medium when not specified
  TestValidator.equals("Priority defaults to medium", task.priority, "medium");

  // Description should be null when not provided
  TestValidator.equals(
    "Description is null when not provided",
    task.description,
    null,
  );

  // Due date should be null when not provided
  TestValidator.equals(
    "Due date is null when not provided",
    task.due_date,
    null,
  );

  // Completed at should be null for pending tasks
  TestValidator.equals(
    "Completed at is null for pending tasks",
    task.completed_at,
    null,
  );

  // Validate timestamps follow ISO 8601 format
  TestValidator.predicate(
    "Created at timestamp follows ISO 8601 format",
    task.created_at.endsWith("Z"),
  );
  TestValidator.predicate(
    "Updated at timestamp follows ISO 8601 format",
    task.updated_at.endsWith("Z"),
  );
}
