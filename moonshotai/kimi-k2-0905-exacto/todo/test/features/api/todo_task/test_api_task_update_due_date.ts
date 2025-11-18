import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppCategory";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test updating a task's due date to validate deadline management
 * functionality.
 *
 * This test creates a user account, creates a new task, and then updates the
 * task with a future due date to ensure the system properly handles temporal
 * planning constraints. Validates that due date updates follow system
 * constraints (future dates only, within 1 year) and properly update the task's
 * temporal planning context.
 *
 * Test flow:
 *
 * 1. Create new user account for authentication
 * 2. Create a new todo task with basic information
 * 3. Update the task with a future due date
 * 4. Verify the due date was properly updated
 * 5. Test edge case: updating with a past date should fail
 * 6. Test edge case: updating with a date beyond 1 year should fail
 */
export async function test_api_task_update_due_date(
  connection: api.IConnection,
) {
  // Create user account for authentication
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);

  // Create a new task
  const task = await api.functional.todoApp.user.tasks.create(connection, {
    body: {
      title: "Complete quarterly report",
      description: "Prepare and review Q4 financial report",
      priority: "High",
    } satisfies ITodoAppTask.ICreate,
  });
  typia.assert(task);

  // Generate a valid future due date (within 1 year from now)
  const oneMonthFromNow = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  // Update task with future due date
  const updatedTask = await api.functional.todoApp.user.tasks.update(
    connection,
    {
      taskId: task.id,
      body: {
        due_date: oneMonthFromNow,
      } satisfies ITodoAppTask.IUpdate,
    },
  );
  typia.assert(updatedTask);

  // Verify due date was updated correctly
  TestValidator.equals(
    "due date updated",
    updatedTask.due_date,
    oneMonthFromNow,
  );
  TestValidator.predicate(
    "due date is future date",
    new Date(updatedTask.due_date!) > new Date(),
  );

  // Test updating with past date should fail
  const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // Yesterday
  await TestValidator.error("should fail with past date", async () => {
    await api.functional.todoApp.user.tasks.update(connection, {
      taskId: task.id,
      body: {
        due_date: pastDate,
      } satisfies ITodoAppTask.IUpdate,
    });
  });

  // Test updating with date beyond 1 year should fail
  const beyondOneYearDate = new Date(
    Date.now() + 366 * 24 * 60 * 60 * 1000,
  ).toISOString(); // More than 1 year
  await TestValidator.error("should fail with date beyond 1 year", async () => {
    await api.functional.todoApp.user.tasks.update(connection, {
      taskId: task.id,
      body: {
        due_date: beyondOneYearDate,
      } satisfies ITodoAppTask.IUpdate,
    });
  });

  // Test updating due date to null (removing deadline)
  const taskWithNoDueDate = await api.functional.todoApp.user.tasks.update(
    connection,
    {
      taskId: task.id,
      body: {
        due_date: null,
      } satisfies ITodoAppTask.IUpdate,
    },
  );
  typia.assert(taskWithNoDueDate);
  TestValidator.equals("due date removed", taskWithNoDueDate.due_date, null);

  // Test only updating due date without affecting other fields
  const titleBeforeUpdate = updatedTask.title;
  const priorityBeforeUpdate = updatedTask.priority;

  const anotherFutureDate = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days from now
  const taskWithNewDueDate = await api.functional.todoApp.user.tasks.update(
    connection,
    {
      taskId: task.id,
      body: {
        due_date: anotherFutureDate,
      } satisfies ITodoAppTask.IUpdate,
    },
  );

  typia.assert(taskWithNewDueDate);
  TestValidator.equals(
    "title unchanged",
    taskWithNewDueDate.title,
    titleBeforeUpdate,
  );
  TestValidator.equals(
    "priority unchanged",
    taskWithNewDueDate.priority,
    priorityBeforeUpdate,
  );
  TestValidator.equals(
    "due date updated to new value",
    taskWithNewDueDate.due_date,
    anotherFutureDate,
  );

  // Test due date validation during initial task creation with valid date
  const taskWithDueDate = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: "Weekly team meeting",
        description: "Schedule and prepare agenda",
        priority: "Medium",
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(taskWithDueDate);
  TestValidator.predicate(
    "task created with valid due date",
    taskWithDueDate.due_date !== null,
  );

  // Test due date validation during initial task creation with past date should fail
  await TestValidator.error(
    "task creation should fail with past due date",
    async () => {
      await api.functional.todoApp.user.tasks.create(connection, {
        body: {
          title: "Update contact information",
          description: "Update client contact details",
          priority: "Low",
          due_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
        } satisfies ITodoAppTask.ICreate,
      });
    },
  );
}
