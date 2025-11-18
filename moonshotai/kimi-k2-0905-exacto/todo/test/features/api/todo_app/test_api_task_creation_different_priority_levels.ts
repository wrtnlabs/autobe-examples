import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test task creation across all priority levels (none, low, medium, high) to
 * validate proper priority handling and default value assignments.
 *
 * This comprehensive test verifies:
 *
 * 1. Task creation with different priority levels
 * 2. Default priority assignment when not specified
 * 3. Proper storage and retrieval of priority values
 * 4. Handling of null and undefined priority values
 *
 * The test creates tasks with each priority level and validates that the
 * priority field is correctly set and returned in the task response.
 */
export async function test_api_task_creation_different_priority_levels(
  connection: api.IConnection,
) {
  // Create user account for authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "TestPassword123",
      href: "https://example.com/home",
      referrer: "https://example.com/login",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Test 1: Create task without priority (should default to medium)
  const taskNoPriority = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 7,
        }),
        status: "pending",
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(taskNoPriority);
  TestValidator.equals(
    "task without priority should default to medium",
    taskNoPriority.priority,
    "medium",
  );

  // Test 2: Create task with "none" priority
  const taskNonePriority = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 7,
        }),
        status: "pending",
        priority: "none",
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(taskNonePriority);
  TestValidator.equals(
    "task with none priority",
    taskNonePriority.priority,
    "none",
  );

  // Test 3: Create task with "low" priority
  const taskLowPriority = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 7,
        }),
        status: "pending",
        priority: "low",
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(taskLowPriority);
  TestValidator.equals(
    "task with low priority",
    taskLowPriority.priority,
    "low",
  );

  // Test 4: Create task with "medium" priority (explicit)
  const taskMediumPriority = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 7,
        }),
        status: "pending",
        priority: "medium",
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(taskMediumPriority);
  TestValidator.equals(
    "task with medium priority",
    taskMediumPriority.priority,
    "medium",
  );

  // Test 5: Create task with "high" priority
  const taskHighPriority = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 7,
        }),
        status: "pending",
        priority: "high",
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(taskHighPriority);
  TestValidator.equals(
    "task with high priority",
    taskHighPriority.priority,
    "high",
  );

  // Test 6: Create task with null priority (should default to medium)
  const taskNullPriority = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 7,
        }),
        status: "pending",
        priority: null,
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(taskNullPriority);
  TestValidator.equals(
    "task with null priority should default to medium",
    taskNullPriority.priority,
    "medium",
  );

  // Test 7: Create task with description and priority
  const taskWithDescription = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 7,
        }),
        description: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 4,
          wordMax: 8,
        }),
        status: "pending",
        priority: "high",
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(taskWithDescription);
  TestValidator.equals(
    "task with description has correct priority",
    taskWithDescription.priority,
    "high",
  );
  TestValidator.predicate(
    "task with description has description",
    !!taskWithDescription.description,
  );

  // Test 8: Create completed task with priority
  const taskCompleted = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 7,
        }),
        status: "completed",
        priority: "low",
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(taskCompleted);
  TestValidator.equals(
    "completed task has correct priority",
    taskCompleted.priority,
    "low",
  );
  TestValidator.equals(
    "completed task has correct status",
    taskCompleted.status,
    "completed",
  );

  // Test 9: Create task with due date and priority
  const futureDate = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
  const taskWithDueDate = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 7,
        }),
        status: "pending",
        priority: "medium",
        due_date: futureDate,
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(taskWithDueDate);
  TestValidator.equals(
    "task with due date has correct priority",
    taskWithDueDate.priority,
    "medium",
  );
  TestValidator.equals(
    "task with due date has correct due date",
    taskWithDueDate.due_date,
    futureDate,
  );

  // Test 10: Create multiple tasks and verify they all have priorities
  const taskBodies = ArrayUtil.repeat(5, (index) => ({
    title: RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 7 }),
    status: "pending" as const,
    priority: RandomGenerator.pick(["none", "low", "medium", "high"] as const),
  }));

  const tasks = await ArrayUtil.asyncMap(taskBodies, async (body) => {
    const task = await api.functional.todoApp.user.tasks.create(connection, {
      body,
    });
    typia.assert(task);
    return task;
  });

  TestValidator.predicate(
    "all created tasks have priorities",
    tasks.every((task) => !!task.priority),
  );
}
