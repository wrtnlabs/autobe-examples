import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_task_create_as_completed(
  connection: api.IConnection,
) {
  // Step 1: Create a user account for task creation
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "password123",
      href: `https://example.com/register`,
      referrer: `https://example.com/signup`,
      name: RandomGenerator.name(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  const userName = user.name ?? null;
  TestValidator.predicate(
    "user should have been created with valid data",
    user.id !== null && user.id !== undefined,
  );

  // Step 2: Create a task with completed status - immediate task closure
  const now = new Date().toISOString();
  const completedTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: "Completed Test Task",
        status: "completed",
        description:
          "This task was created as already completed for migration testing",
        priority: RandomGenerator.pick(["none", "low", "medium", "high"]),
        due_date: RandomGenerator.pick([
          null,
          RandomGenerator.date(new Date(), 86400000 * 30).toISOString(),
        ]),
      } satisfies ITodoAppTask.ICreate,
    },
  );

  typia.assert(completedTask);

  // Step 3: Validate the completed task - core business logic
  TestValidator.equals(
    "task status should be completed immediately",
    completedTask.status,
    "completed",
  );
  TestValidator.predicate(
    "task should have completion timestamp",
    completedTask.completed_at !== null &&
      completedTask.completed_at !== undefined,
  );
  TestValidator.predicate(
    "completion timestamp should be valid ISO format",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d+Z/.test(
      completedTask.completed_at!,
    ),
  );
  TestValidator.predicate(
    "task should belong to correct user",
    completedTask.user.id === user.id,
  );
  TestValidator.predicate(
    "task should have valid creation timestamp",
    completedTask.created_at !== null && completedTask.created_at !== undefined,
  );
  TestValidator.predicate(
    "creation timestamp should be valid ISO format",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d+Z/.test(completedTask.created_at),
  );
  TestValidator.predicate(
    "creation timestamp should precede or equal completion timestamp",
    completedTask.created_at <= completedTask.completed_at!,
  );
  TestValidator.equals(
    "task title should match what was sent",
    completedTask.title,
    "Completed Test Task",
  );
  TestValidator.equals(
    "task description should match what was sent",
    completedTask.description,
    "This task was created as already completed for migration testing",
  );
  TestValidator.equals(
    "task user name should match created user name",
    completedTask.user.name,
    userName,
  );
}
