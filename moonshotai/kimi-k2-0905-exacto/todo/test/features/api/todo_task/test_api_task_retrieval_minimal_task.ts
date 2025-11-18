import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppCategory";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test retrieval of minimally-created tasks containing only required fields.
 *
 * This test validates that the system properly handles tasks created through
 * rapid capture workflows and returns complete information even for tasks with
 * minimal initial data. The test ensures consistency across all task lifecycle
 * states and validates proper handling of optional fields.
 *
 * 1. Create authenticated user account for task operations
 * 2. Create minimal task using only required title field and low priority
 * 3. Retrieve the task using its ID
 * 4. Validate complete task information is returned including user summary
 * 5. Verify optional fields (description, category, due_date) handle
 *    null/undefined correctly
 * 6. Assert task data consistency and system field population
 */
export async function test_api_task_retrieval_minimal_task(
  connection: api.IConnection,
) {
  // Step 1: Create user account for authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "securePassword123",
      ip: "127.0.0.1",
      href: "https://example.com/todo",
      referrer: "https://example.com/signup",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);

  // Step 2: Create minimal task using only required fields
  const minimalTaskTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });
  const createdTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: minimalTaskTitle,
        priority: "Low", // Using system default priority for minimal creation
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(createdTask);

  // Step 3: Retrieve the minimal task using its ID
  const retrievedTask = await api.functional.todoApp.user.tasks.at(connection, {
    taskId: createdTask.id,
  });
  typia.assert(retrievedTask);

  // Step 4: Validate core task properties are returned correctly
  TestValidator.equals("task ID matches", retrievedTask.id, createdTask.id);
  TestValidator.equals(
    "task title matches",
    retrievedTask.title,
    minimalTaskTitle,
  );
  TestValidator.equals(
    "task status is pending",
    retrievedTask.status,
    "pending",
  );
  TestValidator.equals("task priority is Low", retrievedTask.priority, "Low");

  // Step 5: Validate user summary is properly included
  TestValidator.equals("user ID matches", retrievedTask.user.id, user.id);
  TestValidator.equals(
    "user email matches",
    retrievedTask.user.email,
    userEmail,
  );
  TestValidator.predicate(
    "user has valid timestamps",
    () =>
      retrievedTask.user.created_at !== null &&
      typeof retrievedTask.updated_at === "string",
  );

  // Step 6: Verify optional fields are handled correctly
  TestValidator.predicate(
    "description is null or undefined",
    () =>
      retrievedTask.description === null ||
      retrievedTask.description === undefined,
  );
  TestValidator.predicate(
    "category is null or undefined",
    () =>
      retrievedTask.category === null || retrievedTask.category === undefined,
  );
  TestValidator.predicate(
    "due_date is null or undefined",
    () =>
      retrievedTask.due_date === null || retrievedTask.due_date === undefined,
  );

  // Step 7: Validate system-generated fields are populated
  TestValidator.predicate(
    "completion_order is valid integer",
    () =>
      typeof retrievedTask.completion_order === "number" &&
      retrievedTask.completion_order >= 0,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    () =>
      typeof retrievedTask.created_at === "string" &&
      retrievedTask.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    () =>
      typeof retrievedTask.updated_at === "string" &&
      retrievedTask.updated_at.length > 0,
  );
}
