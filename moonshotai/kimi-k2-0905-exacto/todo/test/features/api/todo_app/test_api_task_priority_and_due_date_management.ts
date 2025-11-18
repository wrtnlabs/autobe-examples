import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test task re-prioritization and due date management through partial updates.
 *
 * Validates that users can modify task priority levels (none, low, medium,
 * high), update due dates to reflect scheduling changes, and perform selective
 * field updates without affecting unchanged properties. Ensures partial updates
 * work correctly with timestamp tracking and that updated tasks maintain their
 * original required fields like title and mandatory properties.
 */
export async function test_api_task_priority_and_due_date_management(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "securePassword123",
      href: "https://example.com/register",
      referrer: "https://example.com/home",
      name: RandomGenerator.name(),
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create baseline task with specific priority and due date
  const originalDueDate = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // One week from now
  const baselineTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 7,
        }),
        description: RandomGenerator.paragraph({
          sentences: 4,
          wordMin: 4,
          wordMax: 8,
        }),
        status: "pending",
        priority: "medium",
        due_date: originalDueDate,
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(baselineTask);

  // Step 3: Test priority update from medium to high
  const highPriorityTask = await api.functional.todoApp.user.users.tasks.update(
    connection,
    {
      userId: user.id,
      taskId: baselineTask.id,
      body: {
        priority: "high",
      } satisfies ITodoAppTask.IUpdate,
    },
  );
  typia.assert(highPriorityTask);
  TestValidator.equals(
    "priority updated to high",
    highPriorityTask.priority,
    "high",
  );
  TestValidator.equals(
    "title should remain unchanged",
    highPriorityTask.title,
    baselineTask.title,
  );
  TestValidator.equals(
    "description should remain unchanged",
    highPriorityTask.description,
    baselineTask.description,
  );

  // Step 4: Test priority update from high to low
  const lowPriorityTask = await api.functional.todoApp.user.users.tasks.update(
    connection,
    {
      userId: user.id,
      taskId: baselineTask.id,
      body: {
        priority: "low",
      } satisfies ITodoAppTask.IUpdate,
    },
  );
  typia.assert(lowPriorityTask);
  TestValidator.equals(
    "priority updated to low",
    lowPriorityTask.priority,
    "low",
  );
  TestValidator.equals(
    "title should remain unchanged",
    lowPriorityTask.title,
    baselineTask.title,
  );

  // Step 5: Test priority update from low to none
  const noPriorityTask = await api.functional.todoApp.user.users.tasks.update(
    connection,
    {
      userId: user.id,
      taskId: baselineTask.id,
      body: {
        priority: "none",
      } satisfies ITodoAppTask.IUpdate,
    },
  );
  typia.assert(noPriorityTask);
  TestValidator.equals(
    "priority updated to none",
    noPriorityTask.priority,
    "none",
  );

  // Step 6: Test due date update
  const newDueDate = new Date(
    Date.now() + 14 * 24 * 60 * 60 * 1000,
  ).toISOString(); // Two weeks from now
  const dueDateUpdatedTask =
    await api.functional.todoApp.user.users.tasks.update(connection, {
      userId: user.id,
      taskId: baselineTask.id,
      body: {
        due_date: newDueDate,
      } satisfies ITodoAppTask.IUpdate,
    });
  typia.assert(dueDateUpdatedTask);
  TestValidator.equals(
    "due date updated correctly",
    dueDateUpdatedTask.due_date,
    newDueDate,
  );
  TestValidator.equals(
    "priority should remain unchanged",
    dueDateUpdatedTask.priority,
    noPriorityTask.priority,
  );
  TestValidator.equals(
    "title should remain unchanged",
    dueDateUpdatedTask.title,
    baselineTask.title,
  );

  // Step 7: Test simultaneous priority and due date update
  const finalDueDate = new Date(
    Date.now() + 21 * 24 * 60 * 60 * 1000,
  ).toISOString(); // Three weeks from now
  const combinedUpdateTask =
    await api.functional.todoApp.user.users.tasks.update(connection, {
      userId: user.id,
      taskId: baselineTask.id,
      body: {
        priority: "medium",
        due_date: finalDueDate,
      } satisfies ITodoAppTask.IUpdate,
    });
  typia.assert(combinedUpdateTask);
  TestValidator.equals(
    "priority updated to medium",
    combinedUpdateTask.priority,
    "medium",
  );
  TestValidator.equals(
    "due date updated correctly",
    combinedUpdateTask.due_date,
    finalDueDate,
  );
  TestValidator.equals(
    "description should remain unchanged",
    combinedUpdateTask.description,
    baselineTask.description,
  );

  // Step 8: Verify updated_at timestamp tracking
  TestValidator.predicate(
    "updated_at timestamp should change",
    combinedUpdateTask.updated_at !== baselineTask.updated_at,
  );
  TestValidator.predicate(
    "updated_at should be after created_at",
    new Date(combinedUpdateTask.updated_at).getTime() >=
      new Date(baselineTask.created_at).getTime(),
  );

  // Step 9: Verify task maintains original required fields
  TestValidator.equals(
    "task ID unchanged",
    combinedUpdateTask.id,
    baselineTask.id,
  );
  TestValidator.equals(
    "task title unchanged",
    combinedUpdateTask.title,
    baselineTask.title,
  );
  TestValidator.equals(
    "task status unchanged when not specified",
    combinedUpdateTask.status,
    baselineTask.status,
  );
  TestValidator.equals(
    "user ownership unchanged",
    combinedUpdateTask.user.id,
    user.id,
  );

  // Step 10: Test removing due date (setting to null)
  const noDueDateTask = await api.functional.todoApp.user.users.tasks.update(
    connection,
    {
      userId: user.id,
      taskId: baselineTask.id,
      body: {
        due_date: null,
      } satisfies ITodoAppTask.IUpdate,
    },
  );
  typia.assert(noDueDateTask);
  TestValidator.equals(
    "due date should be null after removal",
    noDueDateTask.due_date,
    null,
  );
  TestValidator.equals(
    "priority should remain unchanged",
    noDueDateTask.priority,
    "medium",
  );
}
