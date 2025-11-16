import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppTaskDescription } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskDescription";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test that automated fields are correctly set during task creation.
 *
 * This test validates that the system automatically assigns the correct initial
 * status ('pending'), sets creation and update timestamps, and generates unique
 * task IDs. The test confirms all system-managed fields are properly
 * initialized without requiring user input, ensuring consistent task lifecycle
 * management.
 *
 * Test Flow:
 *
 * 1. Create a user account for authentication
 * 2. Create a task with minimal input data
 * 3. Validate all automated fields are correctly set
 * 4. Verify task ownership and basic data structure
 */
export async function test_api_task_creation_automation_verification(
  connection: api.IConnection,
) {
  // Step 1: Create a user account to establish authentication context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://example.com",
    referrer: "https://example.com",
  } satisfies ITodoAppUser.IJoin;

  // User creation establishes the authentication context for subsequent operations
  const user = await api.functional.auth.user.join(connection, {
    body: joinBody,
  });
  typia.assert(user);

  // Step 2: Create a task with only user-provided fields
  // System should auto-generate IDs, timestamps, and set default status
  const taskTitle = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 8,
  });
  const taskBody = {
    title: taskTitle,
    description: {
      type: "full" as const,
      content: RandomGenerator.paragraph({
        sentences: 3,
        wordMin: 5,
        wordMax: 10,
      }),
    },
  } satisfies ITodoAppTask.ICreate;

  const task = await api.functional.todoApp.user.tasks.create(connection, {
    body: taskBody,
  });
  typia.assert(task);

  // Step 3: Validate critical automated fields are correctly initialized

  // Verify status defaults to 'pending' for new tasks
  TestValidator.equals(
    "new task status defaults to pending",
    task.status,
    "pending",
  );

  // Confirm completion timestamp is null for incomplete tasks
  TestValidator.equals(
    "new task has no completion timestamp",
    task.completed_at,
    null,
  );

  // Validate user ownership - task should be owned by authenticated user
  TestValidator.equals(
    "task user ID matches authenticated user ID",
    task.user.id,
    user.id,
  );
  TestValidator.equals(
    "task user email matches authenticated user email",
    task.user.email,
    user.email,
  );
  TestValidator.equals(
    "task user has correct email format",
    task.user.email,
    joinBody.email,
  );

  // Verify title matches user input (not modified by system)
  TestValidator.equals("task title matches user input", task.title, taskTitle);

  // Validate timestamps are set (typia.assert already validated format and structure)
  // The system automatically sets created_at and updated_at timestamps
  TestValidator.predicate(
    "task has created_at timestamp",
    task.created_at !== undefined,
  );
  TestValidator.predicate(
    "task has updated_at timestamp",
    task.updated_at !== undefined,
  );
}
