import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTask";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test successful task creation for authenticated users.
 *
 * This test validates the complete task creation workflow including:
 *
 * 1. User registration and authentication setup
 * 2. Task creation with proper description validation (500 character limit)
 * 3. Automatic assignment of default values (completed=false,
 *    business_status='pending')
 * 4. System-generated field validation (timestamps, UUID, user association)
 * 5. Basic task creation functionality with realistic data
 *
 * The test follows the business flow: register user → authenticate → create
 * task → validate response
 */
export async function test_api_task_creation_success(
  connection: api.IConnection,
) {
  // Step 1: Register a new user to establish authentication context
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(10);

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password,
    } satisfies ITodoUser.IJoin,
  });
  typia.assert(user);

  // Step 2: Create first task with realistic description within 500 character limit
  const taskDescription1 = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 8,
  });
  TestValidator.predicate(
    "first task description length within 500 character limit",
    taskDescription1.length <= 500,
  );

  const task1 = await api.functional.todo.user.user_tasks.create(connection, {
    body: {
      description: taskDescription1,
      href: "https://example.com/tasks",
      referrer: "https://example.com/dashboard",
    } satisfies ITodoTask.ICreate,
  });
  typia.assert(task1);

  // Step 3: Validate task creation response with default values
  TestValidator.equals(
    "first task has correct description",
    task1.description,
    taskDescription1,
  );
  TestValidator.equals(
    "first task completion status defaults to false",
    task1.completed,
    false,
  );
  TestValidator.predicate(
    "first task has business status",
    task1.business_status !== undefined && task1.business_status.length > 0,
  );
  TestValidator.predicate(
    "first task has user association",
    task1.user !== null && task1.user.id === user.id,
  );

  // Step 4: Create second task with different description
  const taskDescription2 = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 6,
  });

  const task2 = await api.functional.todo.user.user_tasks.create(connection, {
    body: {
      description: taskDescription2,
      href: "https://example.com/tasks",
      referrer: "https://example.com/dashboard",
    } satisfies ITodoTask.ICreate,
  });
  typia.assert(task2);

  TestValidator.equals(
    "second task has correct description",
    task2.description,
    taskDescription2,
  );
  TestValidator.equals(
    "second task completion status defaults to false",
    task2.completed,
    false,
  );
  TestValidator.notEquals("task IDs are unique", task1.id, task2.id);

  // Step 5: Create task with description near maximum length (480 characters to stay within limit)
  const longDescription = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 15,
    sentenceMax: 20,
    wordMin: 3,
    wordMax: 8,
  });
  const maxLengthDescription = longDescription.substring(0, 480); // Ensure within 500 char limit
  TestValidator.predicate(
    "long description length appropriate",
    maxLengthDescription.length <= 500 && maxLengthDescription.length > 400,
  );

  const task3 = await api.functional.todo.user.user_tasks.create(connection, {
    body: {
      description: maxLengthDescription,
      href: "https://example.com/tasks/long",
      referrer: "https://example.com/dashboard",
    } satisfies ITodoTask.ICreate,
  });
  typia.assert(task3);

  TestValidator.equals(
    "long description task created successfully",
    task3.description,
    maxLengthDescription,
  );

  // Step 6: Verify basic system properties
  TestValidator.predicate(
    "all tasks have different IDs",
    task1.id !== task2.id && task2.id !== task3.id && task1.id !== task3.id,
  );
  TestValidator.predicate(
    "all tasks belong to same user",
    task1.user.id === task2.user.id && task2.user.id === task3.user.id,
  );
  TestValidator.predicate(
    "all tasks have valid created timestamps",
    task1.created_at.length > 0 &&
      task2.created_at.length > 0 &&
      task3.created_at.length > 0,
  );
}
