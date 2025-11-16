import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppTaskDescription } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskDescription";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_task_creation_basic(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account for authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "password123",
      href: "https://example.com/todo",
      referrer: "https://example.com/register",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);

  // Step 2: Create a task with only the required title field
  const taskTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 6,
  });
  const task = await api.functional.todoApp.user.tasks.create(connection, {
    body: {
      title: taskTitle,
    } satisfies ITodoAppTask.ICreate,
  });
  typia.assert(task);

  // Step 3: Validate the response contains all expected properties
  TestValidator.equals("task title matches input", task.title, taskTitle);
  TestValidator.equals("task has valid ID type", typeof task.id, "string");
  TestValidator.equals(
    "task user ID matches authenticated user",
    task.user.id,
    user.id,
  );
  TestValidator.equals("task user email matches", task.user.email, userEmail);

  // Step 4: Validate timestamps are properly set
  TestValidator.predicate("task has creation timestamp", () => {
    return task.created_at !== undefined;
  });
  TestValidator.predicate("task has update timestamp", () => {
    return task.updated_at !== undefined;
  });

  // Step 5: Validate optional fields are handled correctly
  TestValidator.equals(
    "task description is undefined",
    task.description,
    undefined,
  );
  TestValidator.equals("task completed_at is null", task.completed_at, null);
  TestValidator.equals("task status is pending", task.status, "pending");

  // Step 6: Test title length constraints
  const minTitle = "A"; // 1 character
  const maxTitle = RandomGenerator.alphabets(200); // Exactly 200 characters

  // Test minimum title length
  const minTask = await api.functional.todoApp.user.tasks.create(connection, {
    body: {
      title: minTitle,
    } satisfies ITodoAppTask.ICreate,
  });
  typia.assert(minTask);
  TestValidator.equals(
    "minimum length title creates task",
    minTask.title,
    minTitle,
  );

  // Test maximum title length
  const maxTask = await api.functional.todoApp.user.tasks.create(connection, {
    body: {
      title: maxTitle,
    } satisfies ITodoAppTask.ICreate,
  });
  typia.assert(maxTask);
  TestValidator.equals(
    "maximum length title creates task",
    maxTask.title.length,
    200,
  );
  TestValidator.equals(
    "maximum title is within limit",
    maxTask.title.length <= 200,
    true,
  );
}
