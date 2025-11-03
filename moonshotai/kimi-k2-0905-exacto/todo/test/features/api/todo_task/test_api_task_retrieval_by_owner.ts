import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTask";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test retrieving a specific task for an authenticated user.
 *
 * This test validates the complete task retrieval workflow for authorized
 * users. It ensures users can successfully view their own task details
 * including description, completion status, business workflow status, and all
 * relevant timestamps.
 *
 * The test follows this business workflow:
 *
 * 1. Create a new user account through registration
 * 2. Create a sample task under the authenticated user's ownership
 * 3. Retrieve the specific task using the task ID and user ID
 * 4. Validate that all task fields are correctly returned including:
 *
 *    - Task description (up to 500 characters)
 *    - Completion status (completed boolean)
 *    - Business workflow status (pending, processing, completed)
 *    - Creation and modification timestamps
 *    - User ownership information
 * 5. Verify that the system enforces proper ownership restrictions
 * 6. Ensure the operation completes within the 300ms performance requirement
 *
 * This comprehensive test ensures the task management system's core
 * functionality of data access works correctly while maintaining security and
 * performance standards.
 */
export async function test_api_task_retrieval_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account for testing
  const joinData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ITodoUser.IJoin;

  const user: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: joinData },
  );
  typia.assert(user);

  // Step 2: Create a sample task under the authenticated user
  const taskCreateData = {
    description: RandomGenerator.paragraph({
      sentences: 8,
      wordMin: 3,
      wordMax: 8,
    }),
    business_status: "pending",
    href: "https://example.com/todo",
    referrer: "https://example.com",
  } satisfies ITodoTask.ICreate;

  const createdTask: ITodoTask =
    await api.functional.todo.user.todo.tasks.create(connection, {
      body: taskCreateData,
    });
  typia.assert(createdTask);

  // Step 3: Retrieve the specific task using task and user IDs
  const retrievedTask: ITodoTask =
    await api.functional.todo.user.users.tasks.at(connection, {
      userId: user.id,
      taskId: createdTask.id,
    });
  typia.assert(retrievedTask);

  // Step 4: Validate that all task fields are correctly returned
  TestValidator.equals("task ID matches", retrievedTask.id, createdTask.id);
  TestValidator.equals(
    "task description matches",
    retrievedTask.description,
    createdTask.description,
  );
  TestValidator.equals(
    "completion status matches",
    retrievedTask.completed,
    createdTask.completed,
  );
  TestValidator.equals(
    "business status matches",
    retrievedTask.business_status,
    createdTask.business_status,
  );
  TestValidator.equals(
    "creation timestamp matches",
    retrievedTask.created_at,
    createdTask.created_at,
  );
  TestValidator.equals(
    "modification timestamp matches",
    retrievedTask.updated_at,
    createdTask.updated_at,
  );

  // Step 5: Validate user ownership information
  TestValidator.equals("task owner ID matches", retrievedTask.user.id, user.id);
  TestValidator.equals(
    "task owner email matches",
    retrievedTask.user.email,
    user.email,
  );
  TestValidator.predicate(
    "task count is non-negative",
    retrievedTask.user.tasks_count >= 0,
  );
  TestValidator.equals(
    "mfa status matches",
    retrievedTask.user.mfa_enabled,
    user.mfa_enabled,
  );

  // Step 6: Validate that task is not completed by default
  TestValidator.predicate(
    "task is not completed by default",
    retrievedTask.completed === false,
  );
  TestValidator.equals(
    "completed_at is null for incomplete task",
    retrievedTask.completed_at,
    null,
  );

  // Step 7: Create multiple tasks to test data consistency
  const task2Data = {
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 6,
    }),
    business_status: "processing",
    href: "https://example.com/todo2",
    referrer: "https://example.com/todo2-referrer",
  } satisfies ITodoTask.ICreate;

  const task2: ITodoTask = await api.functional.todo.user.todo.tasks.create(
    connection,
    { body: task2Data },
  );
  typia.assert(task2);

  const retrievedTask2: ITodoTask =
    await api.functional.todo.user.users.tasks.at(connection, {
      userId: user.id,
      taskId: task2.id,
    });
  typia.assert(retrievedTask2);

  TestValidator.equals(
    "second task description matches",
    retrievedTask2.description,
    task2.description,
  );
  TestValidator.equals(
    "second task business status matches",
    retrievedTask2.business_status,
    task2.business_status,
  );

  // Step 8: Test performance constraint by measuring operation time
  const startTime = Date.now();
  await api.functional.todo.user.users.tasks.at(connection, {
    userId: user.id,
    taskId: createdTask.id,
  });
  const endTime = Date.now();
  const duration = endTime - startTime;

  TestValidator.predicate(
    "task retrieval completes within 300ms",
    duration <= 300,
  );

  // Step 9: Validate field constraints
  TestValidator.predicate(
    "description length <= 500",
    retrievedTask.description.length <= 500,
  );
  TestValidator.predicate(
    "timestamp formats are valid",
    typia.is<string & tags.Format<"date-time">>(retrievedTask.created_at) &&
      typia.is<string & tags.Format<"date-time">>(retrievedTask.updated_at) &&
      (retrievedTask.completed_at === null ||
        typia.is<string & tags.Format<"date-time">>(
          retrievedTask.completed_at,
        )),
  );

  // Step 10: Test edge case - non-existent task should return error
  const nonExistentTaskId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "non-existent task should return error",
    async () => {
      await api.functional.todo.user.users.tasks.at(connection, {
        userId: user.id,
        taskId: nonExistentTaskId,
      });
    },
  );

  // Step 11: Test ownership restriction - create second user and verify isolation
  const joinData2 = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ITodoUser.IJoin;

  const user2: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: joinData2 },
  );
  typia.assert(user2);

  // User 2 should not be able to access User 1's tasks
  await TestValidator.error(
    "user cannot access other user's tasks",
    async () => {
      await api.functional.todo.user.users.tasks.at(connection, {
        userId: user.id, // User 1's ID
        taskId: createdTask.id, // User 1's task
      });
    },
  );
}
