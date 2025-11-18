import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test task creation with explicit user_id specification to verify the optional
 * user_id parameter functionality. Validates that users can create tasks on
 * behalf of themselves through the optional user_id field while ensuring the
 * authentication system properly validates ownership and association.
 *
 * 1. Create a new user via the auth/join endpoint
 * 2. Create a task without explicitly providing user_id (default behavior)
 * 3. Create a task with explicit user_id parameter set to the authenticated user's
 *    ID
 * 4. Create a task with explicit user_id parameter set to null
 * 5. Validate that all tasks are properly assigned and the user relationship is
 *    maintained
 */
export async function test_api_task_creation_with_user_id_option(
  connection: api.IConnection,
) {
  // Create a new user account for testing
  const userData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "securePassword123",
    name: RandomGenerator.name(),
    href: "https://example.com/join",
    referrer: "https://example.com/home",
    ip: "192.168.1.1",
  } satisfies ITodoAppUser.ICreate;

  // Register new user and establish authentication
  const newUser: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: userData },
  );
  typia.assert(newUser);

  // Test 1: Create task without explicit user_id (default behavior)
  const defaultTaskData = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    status: "pending",
    priority: "medium",
    due_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
  } satisfies ITodoAppTask.ICreate;

  const defaultTask: ITodoAppTask =
    await api.functional.todoApp.user.tasks.create(connection, {
      body: defaultTaskData,
    });
  typia.assert(defaultTask);

  TestValidator.equals(
    "default task user ID matches authenticated user",
    defaultTask.user.id,
    newUser.id,
  );
  TestValidator.equals(
    "default task title matches input",
    defaultTask.title,
    defaultTaskData.title,
  );

  // Test 2: Create task with explicit user_id (set to authenticated user's ID)
  const explicitTaskData = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    status: "pending",
    priority: "high",
    due_date: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
    user_id: newUser.id,
  } satisfies ITodoAppTask.ICreate;

  const explicitTask: ITodoAppTask =
    await api.functional.todoApp.user.tasks.create(connection, {
      body: explicitTaskData,
    });
  typia.assert(explicitTask);

  TestValidator.equals(
    "explicit task user ID matches authenticated user",
    explicitTask.user.id,
    newUser.id,
  );
  TestValidator.equals(
    "explicit task title matches input",
    explicitTask.title,
    explicitTaskData.title,
  );

  // Test 3: Create task with explicit user_id set to null
  const nullUserTaskData = {
    title: RandomGenerator.paragraph({ sentences: 1 }),
    description: null,
    status: "pending",
    priority: "low",
    user_id: null,
  } satisfies ITodoAppTask.ICreate;

  const nullUserTask: ITodoAppTask =
    await api.functional.todoApp.user.tasks.create(connection, {
      body: nullUserTaskData,
    });
  typia.assert(nullUserTask);

  TestValidator.equals(
    "null user task user ID matches authenticated user",
    nullUserTask.user.id,
    newUser.id,
  );
  TestValidator.equals(
    "null user task title matches input",
    nullUserTask.title,
    nullUserTaskData.title,
  );
  TestValidator.equals(
    "null user task description is null",
    nullUserTask.description,
    null,
  );

  // Validate all tasks belong to the same authenticated user
  TestValidator.equals(
    "default task user ID matches new user",
    defaultTask.user.id,
    newUser.id,
  );
  TestValidator.equals(
    "explicit task user ID matches new user",
    explicitTask.user.id,
    newUser.id,
  );
  TestValidator.equals(
    "null user task user ID matches new user",
    nullUserTask.user.id,
    newUser.id,
  );

  // Verify user summary data consistency across all tasks
  TestValidator.equals(
    "default task user email matches new user",
    defaultTask.user.email,
    newUser.email,
  );
  TestValidator.equals(
    "explicit task user email matches new user",
    explicitTask.user.email,
    newUser.email,
  );
  TestValidator.equals(
    "null user task user email matches new user",
    nullUserTask.user.email,
    newUser.email,
  );
}
