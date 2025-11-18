import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test task creation with due dates to validate time-sensitive task management
 * capabilities.
 *
 * This test validates the complete workflow for creating tasks with specific
 * deadlines. It ensures users can effectively manage time-based workloads by:
 *
 * 1. Creating a new user account with authentication
 * 2. Generating a task with a future due date (tomorrow)
 * 3. Verifying the task is created with correct due date information
 * 4. Validating response data matches the input specification
 *
 * The test covers proper date parsing, storage, and retrieval of deadline
 * information to ensure the Todo application's time management features work
 * correctly.
 */
export async function test_api_task_creation_with_due_date(
  connection: api.IConnection,
) {
  // Step 1: Create user account for authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "test1234",
      href: "https://example.com/todo",
      referrer: "https://example.com/signup",
      name: RandomGenerator.name(),
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Calculate tomorrow's date for the due date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dueDate = tomorrow.toISOString();

  // Step 3: Create task with due date
  const taskTitle = RandomGenerator.paragraph({ sentences: 3 });
  const taskDescription = RandomGenerator.content({ paragraphs: 2 });
  const taskPriority = RandomGenerator.pick(["none", "low", "medium", "high"]);

  const task = await api.functional.todoApp.user.users.tasks.create(
    connection,
    {
      userId: user.id,
      body: {
        title: taskTitle,
        description: taskDescription,
        status: "pending",
        priority: taskPriority,
        due_date: dueDate,
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(task);

  // Step 4: Verify task creation and due date
  TestValidator.equals("task title matches", task.title, taskTitle);
  TestValidator.equals(
    "task description matches",
    task.description,
    taskDescription,
  );
  TestValidator.equals("task status is pending", task.status, "pending");
  TestValidator.equals("task priority matches", task.priority, taskPriority);
  TestValidator.equals("task due date matches", task.due_date, dueDate);
  TestValidator.equals("task user ID matches", task.user.id, user.id);
  TestValidator.predicate("task has valid ID", () =>
    typia.is<string & tags.Format<"uuid">>(task.id),
  );
  TestValidator.predicate("task has creation timestamp", () =>
    typia.is<string & tags.Format<"date-time">>(task.created_at),
  );
  TestValidator.predicate("task has update timestamp", () =>
    typia.is<string & tags.Format<"date-time">>(task.updated_at),
  );

  // Step 5: Validate due date is in the future
  const taskDueDate = new Date(task.due_date!);
  const now = new Date();
  TestValidator.predicate("due date is in the future", () => taskDueDate > now);
}
