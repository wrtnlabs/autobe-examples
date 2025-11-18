import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test task creation with priority levels.
 *
 * This test validates the task creation workflow with various priority
 * settings, ensuring that priority levels are correctly handled and stored. The
 * test follows a complete user journey from account creation to task management
 * with priority categorization.
 *
 * 1. User signs up to create account
 * 2. Create tasks with different priority levels (none, low, medium, high)
 * 3. Validate that priority levels are correctly stored in responses
 * 4. Test task properties and user ownership
 */
export async function test_api_task_creation_with_priority(
  connection: api.IConnection,
) {
  // 1. User signs up to create account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "12345678",
      href: "https://example.com/signup",
      referrer: "https://example.com/home",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // 2. Create tasks with different priority levels
  const priorities = ["none", "low", "medium", "high"] as const;
  const createdTasks: ITodoAppTask[] = [];

  for (const priority of priorities) {
    const taskRequest = {
      title: RandomGenerator.paragraph({
        sentences: 1,
        wordMin: 5,
        wordMax: 10,
      }),
      description: RandomGenerator.paragraph({
        sentences: 3,
        wordMin: 4,
        wordMax: 8,
      }),
      status: "pending",
      priority: priority,
    } satisfies ITodoAppTask.ICreate;

    const task = await api.functional.todoApp.user.users.tasks.create(
      connection,
      {
        userId: user.id,
        body: taskRequest,
      },
    );
    typia.assert(task);

    createdTasks.push(task);

    // 3. Validate priority and basic properties
    TestValidator.equals(
      `task priority should be ${priority}`,
      task.priority,
      priority,
    );
    TestValidator.equals(
      "task status should be pending",
      task.status,
      "pending",
    );
    TestValidator.equals(
      "task title matches request",
      task.title,
      taskRequest.title,
    );
    TestValidator.equals(
      "task description matches request",
      task.description,
      taskRequest.description,
    );
  }

  // 4. Validate all tasks were created with proper ownership
  TestValidator.equals("all 4 priority levels tested", createdTasks.length, 4);

  // Verify each task has correct ownership and structure
  createdTasks.forEach((task, index) => {
    TestValidator.equals(
      `task ${index} has valid user ownership`,
      task.user.id,
      user.id,
    );
    TestValidator.equals(
      `task ${index} user has correct email`,
      task.user.email,
      userEmail,
    );
    TestValidator.predicate(
      `task ${index} has valid priority`,
      ["none", "low", "medium", "high"].includes(task.priority || "none"),
    );
  });

  // 5. Verify priority coverage - ensure we created at least one of each priority
  const foundPriorities = new Set(createdTasks.map((t) => t.priority));
  TestValidator.predicate(
    "all priority levels covered",
    foundPriorities.has("none") &&
      foundPriorities.has("low") &&
      foundPriorities.has("medium") &&
      foundPriorities.has("high"),
  );
}
