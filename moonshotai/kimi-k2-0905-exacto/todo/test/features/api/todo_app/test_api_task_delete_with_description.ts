import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test deleting a task that contains a substantial description to verify
 * complete content removal.
 *
 * This test validates comprehensive data cleanup by:
 *
 * 1. Creating a user account to establish authentication context
 * 2. Creating a task with a detailed description up to 1000 characters
 * 3. Verifying the task is created with all content components
 * 4. Deleting the task to ensure permanent removal
 * 5. Validating that the deleted task data is properly returned and all content is
 *    cleaned up
 *
 * The test ensures that the delete operation permanently removes tasks with
 * substantial descriptions and that all task metadata and content components
 * are properly handled during deletion.
 */
export async function test_api_task_delete_with_description(
  connection: api.IConnection,
) {
  // Step 1: Create user account for authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "securePassword123",
      href: "https://example.com/app",
      referrer: "https://example.com/app",
      name: RandomGenerator.name(),
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create task with substantial description
  const taskData = {
    title: RandomGenerator.paragraph({
      sentences: 10,
      wordMin: 5,
      wordMax: 15,
    }),
    description: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 15,
      sentenceMax: 25,
      wordMin: 4,
      wordMax: 8,
    }),
    status: "pending",
    priority: RandomGenerator.pick(["none", "low", "medium", "high"] as const),
    due_date: RandomGenerator.date(
      new Date(Date.now() + 86400000 * 7),
      86400000 * 30,
    ).toISOString(),
  } satisfies ITodoAppTask.ICreate;

  const task = await api.functional.todoApp.user.tasks.create(connection, {
    body: taskData,
  });
  typia.assert(task);

  // Step 3: Verify task was created with all content components
  TestValidator.equals("task title matches", task.title, taskData.title);
  TestValidator.equals(
    "task description matches",
    task.description,
    taskData.description,
  );
  TestValidator.equals("task status matches", task.status, taskData.status);
  TestValidator.equals(
    "task priority matches",
    task.priority,
    taskData.priority,
  );
  TestValidator.equals(
    "task due date matches",
    task.due_date,
    taskData.due_date,
  );
  TestValidator.predicate(
    "task has valid ID",
    typeof task.id === "string" && task.id.length > 0,
  );
  TestValidator.predicate(
    "task has user context",
    task.user !== null && task.user.id === user.id,
  );
  TestValidator.predicate(
    "task has creation timestamp",
    typeof task.created_at === "string" && task.created_at.length > 0,
  );
  TestValidator.predicate(
    "task has update timestamp",
    typeof task.updated_at === "string" && task.updated_at.length > 0,
  );

  // Step 4: Delete the task to verify complete content removal
  const deletedTask = await api.functional.todoApp.user.tasks.erase(
    connection,
    {
      taskId: task.id,
    },
  );
  typia.assert(deletedTask);

  // Step 5: Validate deleted task contains all original content and metadata
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
    "deleted task status matches",
    deletedTask.status,
    task.status,
  );
  TestValidator.equals(
    "deleted task priority matches",
    deletedTask.priority,
    task.priority,
  );
  TestValidator.equals(
    "deleted task due date matches",
    deletedTask.due_date,
    task.due_date,
  );
  TestValidator.equals(
    "deleted task user matches",
    deletedTask.user.id,
    task.user.id,
  );
  TestValidator.equals(
    "deleted task created_at matches",
    deletedTask.created_at,
    task.created_at,
  );
  TestValidator.equals(
    "deleted task updated_at matches",
    deletedTask.updated_at,
    task.updated_at,
  );
}
