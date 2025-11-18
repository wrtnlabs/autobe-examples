import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test task creation with maximum-length titles to validate title length
 * constraints and ensure the system properly handles long task descriptions
 * without truncation or errors. This boundary testing validates the
 * application's ability to handle edge cases in user input length.
 */
export async function test_api_task_creation_maximum_length_title(
  connection: api.IConnection,
) {
  // Step 1: Create a user account for authentication
  const userCreateInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "testPassword123",
    name: RandomGenerator.name(),
    href: "https://example.com/todo-app",
    referrer: "https://example.com/todo-app/signup",
  } satisfies ITodoAppUser.ICreate;

  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: userCreateInput },
  );
  typia.assert(user);
  typia.assert(user.token);

  // Step 2: Create task with maximum-length title (200 characters)
  // Generate a more realistic 200-character title by combining multiple paragraphs and samples
  const titleParts = ArrayUtil.repeat(5, () =>
    RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
  );
  let maxLengthTitle = titleParts.join(" ").substring(0, 200);
  // Ensure exactly 200 characters by padding if necessary
  if (maxLengthTitle.length < 200) {
    maxLengthTitle = maxLengthTitle.padEnd(200, " a");
  }
  // Ensure exactly 200 characters without overflow
  maxLengthTitle = maxLengthTitle.substring(0, 200);

  const taskCreateInput = {
    title: maxLengthTitle,
    description: "Task with maximum length title for boundary testing",
    status: "pending",
    priority: "high",
  } satisfies ITodoAppTask.ICreate;

  const task: ITodoAppTask =
    await api.functional.todoApp.user.users.tasks.create(connection, {
      userId: user.id,
      body: taskCreateInput,
    });
  typia.assert(task);

  // Step 3: Validate that the task was created successfully
  TestValidator.predicate(
    "task id is generated and valid",
    () => task.id !== null && typeof task.id === "string",
  );
  TestValidator.equals(
    "title preserved at full length",
    task.title,
    maxLengthTitle,
  );
  TestValidator.equals(
    "title length is exactly 200 characters",
    task.title.length,
    200,
  );
  TestValidator.equals("task owner matches user", task.user.id, user.id);
  TestValidator.equals("status is pending", task.status, "pending");
  TestValidator.equals("priority is high", task.priority, "high");
  TestValidator.equals(
    "description is preserved",
    task.description!,
    taskCreateInput.description,
  );

  // Step 4: Validate that title is exactly 200 characters with exact match verification
  TestValidator.predicate(
    "title content matches exactly",
    () => task.title.length === 200 && task.title === maxLengthTitle,
  );

  // Step 5: Validate that all other task properties are correctly initialized
  typia.assert(task.created_at);
  typia.assert(task.updated_at);
  TestValidator.predicate(
    "created_at is valid timestamp",
    () => new Date(task.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "updated_at is valid timestamp",
    () => new Date(task.updated_at).getTime() > 0,
  );
  TestValidator.predicate(
    "timestamps are in logical order",
    () =>
      new Date(task.created_at).getTime() <=
      new Date(task.updated_at).getTime(),
  );
}
