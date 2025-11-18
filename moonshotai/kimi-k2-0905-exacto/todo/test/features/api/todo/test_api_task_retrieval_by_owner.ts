import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test successful retrieval of a todo task that belongs to the authenticated
 * user. Validates that users can access their own tasks with complete details
 * including title, description, status, priority, due date, and timestamps.
 *
 * 1. Create user account and authenticate
 * 2. Create a comprehensive todo task
 * 3. Retrieve the task by ID
 * 4. Validate all task properties match the created data
 */
export async function test_api_task_retrieval_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Create user account to establish authentication
  const email = typia.random<string & tags.Format<"email">>();
  const href = `https://example.com/todo-app`;
  const referrer = `https://example.com/login`;

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password: "SecurePass123!",
      name: RandomGenerator.name(),
      href,
      referrer,
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);
  TestValidator.predicate("user email matches input", user.email === email);
  TestValidator.predicate("user status is active", user.status === "active");

  // Step 2: Create a comprehensive todo task
  const taskData = {
    user_id: user.id,
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 12,
    }),
    status: RandomGenerator.pick(["pending", "completed"] as const),
    priority: RandomGenerator.pick(["none", "low", "medium", "high"] as const),
    due_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
  } satisfies ITodoAppTask.ICreate;

  const createdTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: taskData,
    },
  );
  typia.assert(createdTask);

  // Step 3: Retrieve the task by ID
  const retrievedTask = await api.functional.todoApp.user.tasks.at(connection, {
    taskId: createdTask.id,
  });
  typia.assert(retrievedTask);

  // Step 4: Validate all task properties match the created data
  TestValidator.equals(
    "task title matches",
    retrievedTask.title,
    createdTask.title,
  );
  TestValidator.equals(
    "task description matches",
    retrievedTask.description,
    createdTask.description,
  );
  TestValidator.equals(
    "task status matches",
    retrievedTask.status,
    createdTask.status,
  );
  TestValidator.equals(
    "task priority matches",
    retrievedTask.priority,
    createdTask.priority,
  );
  TestValidator.equals(
    "task due date matches",
    retrievedTask.due_date,
    createdTask.due_date,
  );
  TestValidator.equals(
    "task user ID matches",
    retrievedTask.user.id,
    createdTask.user.id,
  );
  TestValidator.equals(
    "task user email matches",
    retrievedTask.user.email,
    createdTask.user.email,
  );

  // Validate task metadata
  TestValidator.predicate("task has valid ID", retrievedTask.id.length > 0);
  TestValidator.predicate(
    "task has creation timestamp",
    retrievedTask.created_at.length > 0,
  );
  TestValidator.predicate(
    "task has update timestamp",
    retrievedTask.updated_at.length > 0,
  );
  TestValidator.predicate(
    "task timestamps are valid ISO format",
    retrievedTask.created_at.includes("T") &&
      retrievedTask.updated_at.includes("T"),
  );

  // Validate relationships
  TestValidator.predicate(
    "task belongs to authenticated user",
    retrievedTask.user.id === user.id,
  );
  TestValidator.predicate(
    "task user email matches authenticated user",
    retrievedTask.user.email === user.email,
  );
  TestValidator.predicate(
    "task is not deleted",
    retrievedTask.deleted_at === null,
  );
}
