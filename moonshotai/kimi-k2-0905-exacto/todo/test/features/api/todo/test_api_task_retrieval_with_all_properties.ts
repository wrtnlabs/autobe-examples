import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test retrieval of a task with all optional properties populated including
 * description, priority, and due date. Validates that tasks with comprehensive
 * metadata return complete information and that all fields are properly
 * serialized in the response.
 *
 * This test follows these steps:
 *
 * 1. Create a new user account to establish authenticated context
 * 2. Create a task with all optional properties (description, priority, due_date)
 *    populated
 * 3. Retrieve the task using the at() endpoint
 * 4. Validate that all properties are correctly returned and serialized
 */
export async function test_api_task_retrieval_with_all_properties(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create authenticated user context
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "TestPassword123!",
      name: RandomGenerator.name(),
      href: "https://example.com/todo",
      referrer: "https://example.com/signup",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create task with all optional properties populated
  const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days from now
  const taskData = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "pending",
    priority: RandomGenerator.pick(["none", "low", "medium", "high"] as const),
    due_date: dueDate,
  } satisfies ITodoAppTask.ICreate;

  const createdTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: taskData,
    },
  );
  typia.assert(createdTask);

  // Step 3: Retrieve the task with all properties
  const retrievedTask = await api.functional.todoApp.user.tasks.at(connection, {
    taskId: createdTask.id,
  });
  typia.assert(retrievedTask);

  // Step 4: Validate all properties are correctly returned
  TestValidator.equals("task ID matches", retrievedTask.id, createdTask.id);
  TestValidator.equals(
    "task title matches",
    retrievedTask.title,
    taskData.title,
  );
  TestValidator.equals(
    "task description matches",
    retrievedTask.description,
    taskData.description,
  );
  TestValidator.equals(
    "task status matches",
    retrievedTask.status,
    taskData.status,
  );
  TestValidator.equals(
    "task priority matches",
    retrievedTask.priority,
    taskData.priority,
  );
  TestValidator.equals(
    "task due date matches",
    retrievedTask.due_date,
    taskData.due_date,
  );

  // Validate that optional fields are populated as expected
  TestValidator.predicate(
    "description is populated",
    retrievedTask.description !== null &&
      retrievedTask.description !== undefined,
  );
  TestValidator.predicate(
    "priority is populated",
    retrievedTask.priority !== null && retrievedTask.priority !== undefined,
  );
  TestValidator.predicate(
    "due_date is populated",
    retrievedTask.due_date !== null && retrievedTask.due_date !== undefined,
  );

  // Validate fields that should be null for a new pending task
  TestValidator.equals(
    "deleted_at is null for active task",
    retrievedTask.deleted_at,
    null,
  );
  TestValidator.equals(
    "completed_at is null for pending task",
    retrievedTask.completed_at,
    null,
  );

  // Validate user information structure
  TestValidator.predicate(
    "user information is present",
    retrievedTask.user !== null && retrievedTask.user !== undefined,
  );
  TestValidator.equals(
    "user has required fields",
    typeof retrievedTask.user.id,
    "string",
  );
  TestValidator.equals(
    "user email format is valid",
    retrievedTask.user.email,
    user.email,
  );
}
