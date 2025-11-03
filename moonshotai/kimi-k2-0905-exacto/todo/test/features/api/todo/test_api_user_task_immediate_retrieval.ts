import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTask";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

export async function test_api_user_task_immediate_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Register new user account for task management access
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies ITodoUser.IJoin,
  });
  typia.assert(user);

  // Create task with business context including session tracking
  const taskDescription = RandomGenerator.paragraph({ sentences: 3 });
  const task = await api.functional.todo.user.tasks.create(connection, {
    body: {
      description: taskDescription,
      href: "https://todo-app.example.com/tasks",
      referrer: "https://todo-app.example.com/",
    } satisfies ITodoTask.ICreate,
  });
  typia.assert(task);

  // Immediately retrieve the task to verify instant availability
  const retrievedTask = await api.functional.todo.user.tasks.at(connection, {
    id: task.id,
  });
  typia.assert(retrievedTask);

  // Validate immediate retrieval returns same task
  TestValidator.equals(
    "task ID matches immediately",
    retrievedTask.id,
    task.id,
  );

  // Validate all required metadata fields are present
  TestValidator.equals(
    "task description matches",
    retrievedTask.description,
    taskDescription,
  );
  TestValidator.equals(
    "completion status is false",
    retrievedTask.completed,
    false,
  );
  TestValidator.equals(
    "business status defaults to pending",
    retrievedTask.business_status,
    "pending",
  );
  TestValidator.predicate(
    "created_at follows ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(
      retrievedTask.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at follows ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(
      retrievedTask.updated_at,
    ),
  );
  TestValidator.equals(
    "completed_at is null for new tasks",
    retrievedTask.completed_at,
    null,
  );
  TestValidator.predicate(
    "user owner information exists",
    !!retrievedTask.user,
  );
  TestValidator.equals("user ID matches", retrievedTask.user.id, user.id);
  TestValidator.equals(
    "user email matches",
    retrievedTask.user.email,
    userEmail,
  );
  TestValidator.predicate(
    "user tasks_count is non-negative integer",
    Number.isInteger(retrievedTask.user.tasks_count) &&
      retrievedTask.user.tasks_count >= 0,
  );
  TestValidator.predicate(
    "user summary contains mfa_enabled field",
    typeof retrievedTask.user.mfa_enabled === "boolean",
  );
}
