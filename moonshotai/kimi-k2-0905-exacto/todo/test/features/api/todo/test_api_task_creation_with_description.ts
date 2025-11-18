import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test task creation with optional description field to validate enhanced task
 * detail support.
 *
 * This test ensures users can provide additional context and details when
 * creating tasks, supporting more comprehensive task documentation and
 * management workflows. The scenario creates a task with both title and
 * description and verifies proper storage and retrieval of the extended task
 * information through the complete API flow from user registration to task
 * creation and validation.
 *
 * Test flow:
 *
 * 1. Create a new user account through authentication
 * 2. Use the authenticated user to create a task with title and description
 * 3. Verify the task contains both title and description fields
 * 4. Validate the task structure matches the expected format
 */
export async function test_api_task_creation_with_description(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account for task creation
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "securePassword123",
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/home",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create a task with both title and description
  const taskTitle = RandomGenerator.name(4); // Shorter title to ensure within 200 char limit
  const taskDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
  });

  const createdTask = await api.functional.todoApp.user.users.tasks.create(
    connection,
    {
      userId: user.id,
      body: {
        title: taskTitle,
        description: taskDescription,
        status: "pending",
        priority: RandomGenerator.pick(["low", "medium", "high"]),
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(createdTask);

  // Step 3: Verify task contains the expected fields
  TestValidator.equals("task has correct title", createdTask.title, taskTitle);
  TestValidator.equals(
    "task has correct description",
    createdTask.description,
    taskDescription,
  );
  TestValidator.equals(
    "task has correct status",
    createdTask.status,
    "pending",
  );
  TestValidator.predicate(
    "task has user information",
    createdTask.user !== null,
  );
  TestValidator.equals(
    "task user has correct ID",
    createdTask.user.id,
    user.id,
  );
  TestValidator.equals(
    "task user has correct email",
    createdTask.user.email,
    userEmail,
  );

  // Step 4: Validate task structure and additional properties
  TestValidator.predicate(
    "task has created_at timestamp",
    createdTask.created_at !== null,
  );
  TestValidator.predicate(
    "task has updated_at timestamp",
    createdTask.updated_at !== null,
  );
  TestValidator.predicate("task has unique ID", createdTask.id.length > 0);
}
