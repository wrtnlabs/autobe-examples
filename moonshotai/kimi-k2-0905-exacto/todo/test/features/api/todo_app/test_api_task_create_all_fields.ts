import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test creating a task with all available fields populated including title,
 * description, status, priority, and due date. Verifies comprehensive task
 * creation with complete data. Validates that users can utilize the full
 * feature set during initial task creation for maximum productivity.
 */
export async function test_api_task_create_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // Create user account for authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "securePassword123",
      name: RandomGenerator.name(),
      href: "https://example.com/todo-app",
      referrer: "https://example.com/signup",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Create comprehensive task with all fields populated
  const taskData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 15,
    }),
    status: RandomGenerator.pick(["pending", "completed"] as const),
    priority: RandomGenerator.pick(["none", "low", "medium", "high"] as const),
    due_date: new Date(
      Date.now() + Math.random() * 365 * 5 * 24 * 60 * 60 * 1000,
    ).toISOString(),
  } satisfies ITodoAppTask.ICreate;

  const task = await api.functional.todoApp.user.tasks.create(connection, {
    body: taskData,
  });
  typia.assert(task);

  // Validate all task fields are correctly stored
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
    "task due date matches input",
    task.due_date,
    taskData.due_date,
  );
  TestValidator.equals("task user ID matches creator", task.user.id, user.id);
  TestValidator.predicate(
    "task has valid created timestamp",
    !!task.created_at,
  );
  TestValidator.predicate(
    "task has valid updated timestamp",
    !!task.updated_at,
  );
}
