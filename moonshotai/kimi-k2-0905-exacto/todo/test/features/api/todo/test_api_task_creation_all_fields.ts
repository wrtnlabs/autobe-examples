import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test task creation with all available fields populated including title,
 * description, status, priority, and due date. Validates that comprehensive
 * task creation works correctly and that all fields are properly validated,
 * stored, and returned in the response.
 *
 * Test flow:
 *
 * 1. Create authenticated user through user registration
 * 2. Create task with all available fields populated
 * 3. Validate that all fields are correctly returned in the response
 * 4. Verify that the task belongs to the authenticated user
 * 5. Check that timestamps and metadata are properly set
 */
export async function test_api_task_creation_all_fields(
  connection: api.IConnection,
) {
  // Create authenticated user first (required dependency)
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "SecurePassword123!",
        name: RandomGenerator.name(),
        href: "https://todoapp.com/register",
        referrer: "https://todoapp.com/login",
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(user);

  // Create task with all available fields populated
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30); // Due date 30 days from now (within 5 years limit)

  const taskData = {
    title: RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 6,
    }),
    status: "pending",
    priority: RandomGenerator.pick(["none", "low", "medium", "high"]),
    due_date: dueDate.toISOString(),
  } satisfies ITodoAppTask.ICreate;

  const task: ITodoAppTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: taskData,
    },
  );
  typia.assert(task);

  // Validate all fields are correctly returned
  TestValidator.equals("task title matches input", task.title, taskData.title);
  TestValidator.equals(
    "task description matches input",
    task.description,
    taskData.description,
  );
  TestValidator.equals(
    "task status matches input",
    task.status,
    taskData.status,
  );
  TestValidator.equals(
    "task priority matches input",
    task.priority,
    taskData.priority,
  );
  TestValidator.equals(
    "task due_date matches input",
    task.due_date,
    taskData.due_date,
  );

  // Verify task ownership
  TestValidator.equals(
    "task user ID matches authenticated user",
    task.user.id,
    user.id,
  );
  TestValidator.equals(
    "task user email matches authenticated user",
    task.user.email,
    user.email,
  );

  // Validate metadata fields
  TestValidator.predicate(
    "task has valid ID",
    typia.is<string & tags.Format<"uuid">>(task.id),
  );
  TestValidator.predicate(
    "task has creation timestamp",
    typia.is<string & tags.Format<"date-time">>(task.created_at),
  );
  TestValidator.predicate(
    "task has update timestamp",
    typia.is<string & tags.Format<"date-time">>(task.updated_at),
  );
  TestValidator.equals("task is not deleted", task.deleted_at, null);
  TestValidator.equals("task is not completed", task.completed_at, null);

  // Test creating a minimal task (testing optional field handling)
  const minimalTaskData = {
    title: RandomGenerator.paragraph({ sentences: 1, wordMin: 2, wordMax: 5 }),
    status: "pending",
  } satisfies ITodoAppTask.ICreate;

  const minimalTask: ITodoAppTask =
    await api.functional.todoApp.user.tasks.create(connection, {
      body: minimalTaskData,
    });
  typia.assert(minimalTask);

  TestValidator.equals(
    "minimal task title matches",
    minimalTask.title,
    minimalTaskData.title,
  );
  TestValidator.equals(
    "minimal task status matches",
    minimalTask.status,
    minimalTaskData.status,
  );
  TestValidator.equals(
    "minimal task description is null",
    minimalTask.description,
    null,
  );
  TestValidator.equals(
    "minimal task priority is null",
    minimalTask.priority,
    null,
  );
  TestValidator.equals(
    "minimal task due_date is null",
    minimalTask.due_date,
    null,
  );
}
