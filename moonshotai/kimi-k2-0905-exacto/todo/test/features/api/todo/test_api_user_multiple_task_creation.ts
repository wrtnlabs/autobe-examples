import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTask";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test multiple task creation workflow to validate unique description
 * constraint per user.
 *
 * This test validates the application's ability to manage multiple unique tasks
 * per user by creating several tasks with different descriptions and ensuring
 * no duplicate conflicts occur. The test follows the complete user journey from
 * registration through multiple task creations, verifying each step maintains
 * data integrity and proper business logic.
 *
 * 1. Create user account for testing task creation scenarios
 * 2. Generate multiple tasks with unique descriptions
 * 3. Verify each task creation succeeds with distinct properties
 * 4. Validate task count increments correctly with each creation
 * 5. Ensure no duplicate description conflicts occur
 * 6. Confirm all tasks have proper business workflow status
 */
export async function test_api_user_multiple_task_creation(
  connection: api.IConnection,
) {
  // Create user account for testing
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(10),
    } satisfies ITodoUser.IJoin,
  });
  typia.assert(user);

  // Generate multiple unique task descriptions
  const taskDescriptions = ArrayUtil.repeat(5, (index) =>
    RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
  );

  // Create multiple tasks with unique descriptions
  const createdTasks: ITodoTask[] = [];

  for (const description of taskDescriptions) {
    const task = await api.functional.todo.user.tasks.create(connection, {
      body: {
        description: description,
        business_status: "pending",
        href: "/todo/dashboard",
        referrer: "/todo/create",
      } satisfies ITodoTask.ICreate,
    });
    typia.assert(task);

    createdTasks.push(task);

    // Verify task properties
    TestValidator.equals(
      "task description matches input",
      task.description,
      description,
    );
    TestValidator.equals(
      "task completed status is false",
      task.completed,
      false,
    );
    TestValidator.equals(
      "task business status is pending",
      task.business_status,
      "pending",
    );
    TestValidator.predicate("task has valid UUID format ID", () =>
      typia.is<string & tags.Format<"uuid">>(task.id),
    );
    TestValidator.predicate(
      "task has creation timestamp",
      () => task.created_at !== null && task.created_at !== undefined,
    );
    TestValidator.equals("task belongs to current user", task.user.id, user.id);
    TestValidator.equals(
      "task user email matches",
      task.user.email,
      user.email,
    );
  }

  // Validate all descriptions are unique
  const uniqueDescriptions = new Set(taskDescriptions);
  TestValidator.equals(
    "all task descriptions are unique",
    uniqueDescriptions.size,
    taskDescriptions.length,
  );

  // Verify task count incremented correctly (starting from 0)
  TestValidator.equals(
    "created tasks count matches expected",
    createdTasks.length,
    5,
  );

  // Validate no duplicate IDs were generated
  const taskIds = createdTasks.map((task) => task.id);
  const uniqueIds = new Set(taskIds);
  TestValidator.equals(
    "all task IDs are unique",
    uniqueIds.size,
    taskIds.length,
  );

  // Verify task descriptions match across all created tasks
  const createdDescriptions = createdTasks.map((task) => task.description);
  TestValidator.equals(
    "created task descriptions match input",
    createdDescriptions,
    taskDescriptions,
  );
}
