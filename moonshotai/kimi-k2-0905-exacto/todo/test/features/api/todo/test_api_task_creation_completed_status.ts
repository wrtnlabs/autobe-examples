import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_task_creation_completed_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new user for authentication
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

  // 2. Create task with completed status
  const taskTitle = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 8,
  });
  const taskDescription = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 10,
  });

  const completedTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: taskTitle,
        description: taskDescription,
        status: "completed",
        priority: "high",
        due_date: typia.random<string & tags.Format<"date-time">>(),
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(completedTask);

  // 3. Validate task creation with completed status
  TestValidator.equals(
    "task has completed status",
    completedTask.status,
    "completed",
  );

  // 4. Verify completed_at timestamp is set immediately
  TestValidator.predicate(
    "completed_at timestamp exists",
    completedTask.completed_at !== null &&
      completedTask.completed_at !== undefined,
  );
  TestValidator.predicate(
    "completed_at is valid date",
    new Date(completedTask.completed_at!).toString() !== "Invalid Date",
  );

  // 5. Verify all task fields are properly set
  TestValidator.equals("task title matches", completedTask.title, taskTitle);
  TestValidator.equals(
    "task description matches",
    completedTask.description,
    taskDescription,
  );
  TestValidator.equals("task priority matches", completedTask.priority, "high");
  TestValidator.predicate(
    "task has user information",
    completedTask.user !== null && completedTask.user !== undefined,
  );
  TestValidator.equals("task user ID matches", completedTask.user.id, user.id);
  TestValidator.equals(
    "task user email matches",
    completedTask.user.email,
    user.email,
  );
  TestValidator.predicate(
    "task created_at exists",
    completedTask.created_at !== null && completedTask.created_at !== undefined,
  );
  TestValidator.predicate(
    "task updated_at exists",
    completedTask.updated_at !== null && completedTask.updated_at !== undefined,
  );

  // 6. Verify timestamps are reasonable (completed_at should be after created_at or equal)
  const createdAt = new Date(completedTask.created_at);
  const completedAt = new Date(completedTask.completed_at!);
  TestValidator.predicate(
    "completed_at is after or equal to created_at",
    completedAt.getTime() >= createdAt.getTime(),
  );

  // 7. Validate due_date is preserved
  TestValidator.predicate(
    "due_date is preserved",
    completedTask.due_date !== null && completedTask.due_date !== undefined,
  );
}
