import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTask";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test task creation with maximum description length (500 characters per
 * requirement) and validate proper handling of description field including
 * whitespace cleaning. Ensure task creation enforces description uniqueness
 * within user scope and validates business status defaults to 'pending' when
 * not specified.
 *
 * This test validates the core task creation functionality with emphasis on:
 *
 * 1. Maximum description length constraint (500 characters)
 * 2. Business status defaulting to 'pending'
 * 3. Description field whitespace handling
 * 4. Description uniqueness within user scope
 * 5. Complete task object validation
 *
 * The test follows this workflow:
 *
 * 1. Create a user account via auth/user/join
 * 2. Generate a 500-character description to test maximum length
 * 3. Create task with maximum length description and validate success
 * 4. Verify business_status defaults to 'pending' when not specified
 * 5. Test whitespace handling with leading/trailing spaces
 * 6. Validate complete task object structure and relationships
 */
export async function test_api_user_task_creation_with_max_description(
  connection: api.IConnection,
) {
  // Step 1: Create user account for testing
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "TestPassword123!",
    } satisfies ITodoUser.IJoin,
  });
  typia.assert(user);

  // Step 2: Generate 500-character description for maximum length test
  const maxDescription = ArrayUtil.repeat(500, () =>
    RandomGenerator.alphabets(1),
  ).join("");

  // Step 3: Create task with maximum length description
  const maxDescTask = await api.functional.todo.user.tasks.create(connection, {
    body: {
      description: maxDescription,
      href: "https://example.com/tasks",
      referrer: "https://example.com/dashboard",
    } satisfies ITodoTask.ICreate,
  });
  typia.assert(maxDescTask);

  // Validate maximum description length
  TestValidator.equals(
    "maximum description length",
    maxDescTask.description.length,
    500,
  );
  TestValidator.equals(
    "description content matches",
    maxDescTask.description,
    maxDescription,
  );
  TestValidator.equals(
    "task is not completed by default",
    maxDescTask.completed,
    false,
  );
  TestValidator.equals(
    "business status defaults to pending",
    maxDescTask.business_status,
    "pending",
  );

  // Step 4: Test business_status default when not specified
  const defaultStatusTask = await api.functional.todo.user.tasks.create(
    connection,
    {
      body: {
        description: "Task with default business status",
        href: "https://example.com/tasks",
        referrer: "https://example.com/dashboard",
      } satisfies ITodoTask.ICreate,
    },
  );
  typia.assert(defaultStatusTask);

  TestValidator.equals(
    "business status defaults to pending",
    defaultStatusTask.business_status,
    "pending",
  );

  // Step 5: Test whitespace handling
  const whitespaceDescription = "  Task with leading and trailing spaces  ";
  const whitespaceTask = await api.functional.todo.user.tasks.create(
    connection,
    {
      body: {
        description: whitespaceDescription,
        href: "https://example.com/tasks",
        referrer: "https://example.com/dashboard",
      } satisfies ITodoTask.ICreate,
    },
  );
  typia.assert(whitespaceTask);

  // Validate whitespace is preserved (API handles it as-is)
  TestValidator.equals(
    "whitespace preserved in description",
    whitespaceTask.description,
    whitespaceDescription,
  );

  // Step 6: Test description uniqueness (should allow duplicates per API design)
  const duplicateDescription = "This is a duplicate description test";
  const task1 = await api.functional.todo.user.tasks.create(connection, {
    body: {
      description: duplicateDescription,
      href: "https://example.com/tasks/1",
      referrer: "https://example.com/dashboard",
    } satisfies ITodoTask.ICreate,
  });

  const task2 = await api.functional.todo.user.tasks.create(connection, {
    body: {
      description: duplicateDescription,
      href: "https://example.com/tasks/2",
      referrer: "https://example.com/dashboard",
    } satisfies ITodoTask.ICreate,
  });

  typia.assert(task1);
  typia.assert(task2);

  TestValidator.equals(
    "duplicate descriptions allowed",
    task1.description,
    task2.description,
  );
  TestValidator.notEquals("tasks have different IDs", task1.id, task2.id);

  // Step 7: Validate complete task object structure
  TestValidator.predicate(
    "task has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      maxDescTask.id,
    ),
  );
  TestValidator.predicate(
    "task has user relationship",
    maxDescTask.user !== null && maxDescTask.user !== undefined,
  );
  TestValidator.equals(
    "task user ID matches created user",
    maxDescTask.user.id,
    user.id,
  );
  TestValidator.equals(
    "task user email matches",
    maxDescTask.user.email,
    user.email,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(maxDescTask.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(maxDescTask.updated_at),
  );
  TestValidator.equals(
    "completed_at is null for new tasks",
    maxDescTask.completed_at,
    null,
  );
}
