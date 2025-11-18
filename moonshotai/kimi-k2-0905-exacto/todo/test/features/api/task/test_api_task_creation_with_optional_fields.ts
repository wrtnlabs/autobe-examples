import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Comprehensive test for task creation with all optional fields in the Todo
 * application.
 *
 * Tests task creation functionality with various combinations of optional
 * fields:
 *
 * - Basic task creation with minimal required fields
 * - Task creation with maximum length title
 * - Task creation with optional description field
 * - Task creation with all priority levels (none, low, medium, high)
 * - Task creation with due date within 5-year validation window
 * - Task creation with completed status
 * - Task creation with all optional fields combined
 * - Validation of task ownership and data integrity
 */
export async function test_api_task_creation_with_optional_fields(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user context for task creation
  const email = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password: "securePassword123",
      name: RandomGenerator.name(),
      ip: "192.168.1.1",
      href: "https://example.com/todo-app",
      referrer: "https://example.com/home",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Test 1: Create basic task with minimal required fields
  const basicTask = await api.functional.todoApp.user.users.tasks.create(
    connection,
    {
      userId: user.id,
      body: {
        title: "Basic Task",
        status: "pending",
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(basicTask);

  TestValidator.equals("basic task title", basicTask.title, "Basic Task");
  TestValidator.equals("basic task status", basicTask.status, "pending");
  TestValidator.equals("basic task user ID", basicTask.user.id, user.id);
  TestValidator.equals(
    "basic task description is null",
    basicTask.description,
    null,
  );
  TestValidator.equals("basic task priority is null", basicTask.priority, null);
  TestValidator.equals("basic task due date is null", basicTask.due_date, null);

  // Test 2: Create task with maximum length title (200 characters)
  const maxTitle = RandomGenerator.alphabets(200);
  const maxTitleTask = await api.functional.todoApp.user.users.tasks.create(
    connection,
    {
      userId: user.id,
      body: {
        title: maxTitle,
        status: "pending",
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(maxTitleTask);

  TestValidator.equals("max title task title", maxTitleTask.title, maxTitle);
  TestValidator.equals("max title task status", maxTitleTask.status, "pending");

  // Test 3: Create task with optional description field
  const descriptionTask = await api.functional.todoApp.user.users.tasks.create(
    connection,
    {
      userId: user.id,
      body: {
        title: "Task with Description",
        status: "pending",
        description: RandomGenerator.paragraph({
          sentences: 10,
          wordMin: 5,
          wordMax: 15,
        }),
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(descriptionTask);

  TestValidator.equals(
    "description task title",
    descriptionTask.title,
    "Task with Description",
  );
  await TestValidator.predicate(
    "description task has description",
    descriptionTask.description !== null &&
      descriptionTask.description !== undefined,
  );
  await TestValidator.predicate(
    "description length under limit",
    (descriptionTask.description ? descriptionTask.description.length : 0) <=
      1000,
  );

  // Test 4: Create tasks with different priority levels
  const priorities = ["none", "low", "medium", "high"] as const;

  for (const priority of priorities) {
    const priorityTask = await api.functional.todoApp.user.users.tasks.create(
      connection,
      {
        userId: user.id,
        body: {
          title: `Task with ${priority} priority`,
          status: "pending",
          priority,
        } satisfies ITodoAppTask.ICreate,
      },
    );
    typia.assert(priorityTask);

    TestValidator.equals(
      `${priority} priority task title`,
      priorityTask.title,
      `Task with ${priority} priority`,
    );
    TestValidator.equals(
      `${priority} priority task priority`,
      priorityTask.priority,
      priority,
    );
  }

  // Test 5: Create task with due date within 5-year validation window
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 2); // 2 years in future

  const dueDateTask = await api.functional.todoApp.user.users.tasks.create(
    connection,
    {
      userId: user.id,
      body: {
        title: "Task with Due Date",
        status: "pending",
        due_date: futureDate.toISOString(),
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(dueDateTask);

  TestValidator.equals(
    "due date task title",
    dueDateTask.title,
    "Task with Due Date",
  );
  await TestValidator.predicate(
    "due date task has due date",
    dueDateTask.due_date !== null && dueDateTask.due_date !== undefined,
  );
  await TestValidator.predicate(
    "due date is in future",
    new Date(dueDateTask.due_date!) > new Date(),
  );

  // Test 6: Create completed task
  const completedTask = await api.functional.todoApp.user.users.tasks.create(
    connection,
    {
      userId: user.id,
      body: {
        title: "Completed Task",
        status: "completed",
        description: "This task is already completed",
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(completedTask);

  TestValidator.equals(
    "completed task title",
    completedTask.title,
    "Completed Task",
  );
  TestValidator.equals(
    "completed task status",
    completedTask.status,
    "completed",
  );
  await TestValidator.predicate(
    "completed task has completion date",
    completedTask.completed_at !== null &&
      completedTask.completed_at !== undefined,
  );

  // Test 7: Create task with all optional fields combined
  const optionalDate = new Date();
  optionalDate.setFullYear(optionalDate.getFullYear() + 1); // 1 year in future

  const fullTask = await api.functional.todoApp.user.users.tasks.create(
    connection,
    {
      userId: user.id,
      body: {
        title: "Full Featured Task",
        status: "pending",
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 8,
        }),
        priority: "high",
        due_date: optionalDate.toISOString(),
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(fullTask);

  TestValidator.equals("full task title", fullTask.title, "Full Featured Task");
  TestValidator.equals("full task status", fullTask.status, "pending");
  await TestValidator.predicate(
    "full task has description",
    fullTask.description !== null && fullTask.description !== undefined,
  );
  TestValidator.equals("full task priority", fullTask.priority, "high");
  await TestValidator.predicate(
    "full task has due date",
    fullTask.due_date !== null && fullTask.due_date !== undefined,
  );

  // Validate task ownership across all created tasks
  const allTasks = [
    basicTask,
    maxTitleTask,
    descriptionTask,
    completedTask,
    fullTask,
  ];
  await TestValidator.predicate(
    "all tasks belong to user",
    allTasks.every((task) => task.user.id === user.id),
  );

  // Validate task creation timestamps
  await TestValidator.predicate(
    "tasks have valid timestamps",
    allTasks.every(
      (task) =>
        typeof task.created_at === "string" &&
        task.created_at.length > 0 &&
        typeof task.updated_at === "string" &&
        task.updated_at.length > 0,
    ),
  );
}
