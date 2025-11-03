import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTask";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

export async function test_api_task_completion_workflow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new user for authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "test1234",
    } satisfies ITodoUser.IJoin,
  });
  typia.assert(user);

  // 2. Create a new task in pending status
  const taskDescription = RandomGenerator.paragraph({ sentences: 3 });
  const newTask = await api.functional.todo.user.todo.tasks.create(connection, {
    body: {
      description: taskDescription,
      href: "https://example.com/todo",
      referrer: "https://example.com",
    } satisfies ITodoTask.ICreate,
  });
  typia.assert(newTask);

  // Verify task is initially not completed
  TestValidator.predicate(
    "task should not be completed initially",
    newTask.completed === false,
  );
  TestValidator.predicate(
    "task should have null completed_at initially",
    newTask.completed_at === null,
  );
  TestValidator.predicate(
    "task should have pending business_status",
    newTask.business_status === "pending",
  );

  // 3. Update task to mark as completed
  const updatedTask = await api.functional.todo.user.todo.tasks.update(
    connection,
    {
      taskId: newTask.id,
      body: {
        completed: true,
      } satisfies ITodoTask.IUpdate,
    },
  );
  typia.assert(updatedTask);

  // 4. Validate task completion state
  TestValidator.predicate(
    "task should be marked as completed",
    updatedTask.completed === true,
  );
  TestValidator.predicate(
    "completed_at should be set after completion",
    updatedTask.completed_at !== null,
  );
  TestValidator.predicate(
    "completed_at should be valid date-time string",
    typeof updatedTask.completed_at === "string" &&
      updatedTask.completed_at.length > 0,
  );

  // 5. Verify business status reflects completion
  TestValidator.predicate(
    "business_status should show completed state",
    updatedTask.business_status.includes("completed"),
  );

  // Additional validation: ensure timestamps are properly updated
  TestValidator.predicate(
    "updated_at timestamp should be set after modification",
    new Date(updatedTask.updated_at).getTime() >=
      new Date(newTask.created_at).getTime(),
  );
}
