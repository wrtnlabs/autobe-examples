import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test deleting a high-priority task to ensure no restrictions on
 * priority-based deletions.
 *
 * This test validates that tasks of any priority level can be removed without
 * business logic constraints. It verifies that priority designation does not
 * prevent task deletion or require special approval processes, ensuring users
 * can clean up their task lists regardless of priority settings.
 *
 * Test workflow:
 *
 * 1. Create a new user account for task management
 * 2. Create a high-priority task for deletion testing
 * 3. Delete the high-priority task using the erase endpoint
 * 4. Verify the deletion response returns complete task data
 * 5. Test with multiple priority levels to ensure universal deletion capability
 * 6. Confirm that task ownership is properly validated
 */
export async function test_api_task_delete_high_priority(
  connection: api.IConnection,
) {
  // Step 1: Create user account for task management
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "testPassword123",
      name: RandomGenerator.name(),
      href: "https://todoapp.example.com/",
      referrer: "https://todoapp.example.com/",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create high-priority task for deletion testing
  const taskTitle =
    "High Priority Task: " + RandomGenerator.paragraph({ sentences: 3 });
  const task = await api.functional.todoApp.user.tasks.create(connection, {
    body: {
      title: taskTitle,
      description: RandomGenerator.content({ paragraphs: 2 }),
      status: "pending",
      priority: "high",
    } satisfies ITodoAppTask.ICreate,
  });
  typia.assert(task);

  // Verify task was created with high priority
  TestValidator.equals("task has high priority", task.priority, "high");
  TestValidator.equals("task title matches", task.title, taskTitle);
  TestValidator.equals("task status is pending", task.status, "pending");

  // Step 3: Delete the high-priority task
  const deletedTask = await api.functional.todoApp.user.tasks.erase(
    connection,
    {
      taskId: task.id,
    },
  );
  typia.assert(deletedTask);

  // Step 4: Verify deletion response contains complete task data
  TestValidator.equals("deleted task ID matches", deletedTask.id, task.id);
  TestValidator.equals(
    "deleted task title matches",
    deletedTask.title,
    task.title,
  );
  TestValidator.equals(
    "deleted task description matches",
    deletedTask.description,
    task.description,
  );
  TestValidator.equals(
    "deleted task priority matches",
    deletedTask.priority,
    task.priority,
  );
  TestValidator.equals(
    "deleted task user ID matches",
    deletedTask.user.id,
    user.id,
  );

  // Step 5: Test with additional priority levels to ensure universal deletion
  const priorityLevels = ["low", "medium", "high"];
  for (const priority of priorityLevels) {
    // Create task with specific priority
    const priorityTaskTitle = `${priority} Priority Test Task`;
    const priorityTask = await api.functional.todoApp.user.tasks.create(
      connection,
      {
        body: {
          title: priorityTaskTitle,
          description: `Task created to test ${priority} priority deletion`,
          status: "completed",
          priority: priority,
        } satisfies ITodoAppTask.ICreate,
      },
    );
    typia.assert(priorityTask);

    // Verify priority was set correctly
    TestValidator.equals(
      `task has ${priority} priority`,
      priorityTask.priority,
      priority,
    );

    // Delete the task
    const deletedPriorityTask = await api.functional.todoApp.user.tasks.erase(
      connection,
      {
        taskId: priorityTask.id,
      },
    );
    typia.assert(deletedPriorityTask);

    // Verify deletion succeeded
    TestValidator.equals(
      `deleted ${priority} task ID matches`,
      deletedPriorityTask.id,
      priorityTask.id,
    );
    TestValidator.equals(
      `deleted ${priority} task priority matches`,
      deletedPriorityTask.priority,
      priority,
    );
  }

  // Step 6: Verify task ownership validation
  await TestValidator.error("non-existent task ID should fail", async () => {
    await api.functional.todoApp.user.tasks.erase(connection, {
      taskId: typia.random<string & tags.Format<"uuid">>(),
    });
  });
}
