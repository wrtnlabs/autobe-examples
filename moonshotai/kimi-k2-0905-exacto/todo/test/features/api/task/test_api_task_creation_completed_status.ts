import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test task creation with 'completed' status to validate immediate task
 * completion workflows. This validates that users can create tasks that are
 * already completed, supporting scenarios where users want to log completed
 * activities or retroactively track finished work. The scenario creates a
 * pre-completed task and verifies proper completion status assignment and
 * timestamp recording.
 */
export async function test_api_task_creation_completed_status(
  connection: api.IConnection,
) {
  // Create user for testing completed task creation
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "testPassword123",
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/home",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Create a completed task
  const completedTask = await api.functional.todoApp.user.users.tasks.create(
    connection,
    {
      userId: user.id,
      body: {
        title: "Completed project documentation",
        description:
          "Finished writing all technical documentation for the project",
        status: "completed",
        priority: "high",
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(completedTask);

  // Verify task properties
  TestValidator.equals(
    "task title matches",
    completedTask.title,
    "Completed project documentation",
  );
  TestValidator.equals(
    "task status is completed",
    completedTask.status,
    "completed",
  );
  TestValidator.equals("task priority is high", completedTask.priority, "high");
  TestValidator.equals(
    "task description matches",
    completedTask.description,
    "Finished writing all technical documentation for the project",
  );
  TestValidator.equals("task user matches", completedTask.user.id, user.id);
  TestValidator.predicate(
    "task has completion timestamp",
    completedTask.completed_at !== null,
  );
  TestValidator.predicate(
    "completion timestamp is valid date",
    new Date(completedTask.completed_at!).toString() !== "Invalid Date",
  );
  TestValidator.predicate(
    "task has creation timestamp",
    completedTask.created_at !== null,
  );
  TestValidator.predicate(
    "task has update timestamp",
    completedTask.updated_at !== null,
  );

  // Verify user relationship
  TestValidator.equals(
    "user email matches",
    completedTask.user.email,
    userEmail,
  );
  TestValidator.equals(
    "user status matches",
    completedTask.user.status,
    user.status,
  );
  TestValidator.equals("user name matches", completedTask.user.name, user.name);

  // Verify CRUD operation tracking
  TestValidator.predicate(
    "created_at is defined",
    completedTask.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is defined",
    completedTask.updated_at !== undefined,
  );
  TestValidator.predicate(
    "completion timestamp defined",
    completedTask.completed_at !== undefined,
  );
}
