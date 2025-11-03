import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTask";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test complete task creation workflow for authenticated users.
 *
 * This test validates the full process of user registration followed by task
 * creation to ensure proper integration between authentication and todo task
 * management systems.
 *
 * 1. Create a new user account through the auth system
 * 2. Use the authenticated connection to create multiple tasks with various
 *    description lengths
 * 3. Verify task association with authenticated user
 * 4. Confirm default business status of "pending" is applied
 * 5. Validate immediate task availability without additional queries
 * 6. Test edge cases including empty and maximum-length descriptions
 */
export async function test_api_task_creation_workflow(
  connection: api.IConnection,
) {
  // Step 1: Register a new user
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);

  const joinRequest = {
    body: {
      email: email,
      password: password,
    } satisfies ITodoUser.IJoin,
  };

  const user = await api.functional.auth.user.join(connection, joinRequest);
  typia.assert(user);

  TestValidator.predicate(
    "user has valid ID",
    typeof user.id === "string" && user.id.length > 0,
  );
  TestValidator.equals("user email matches", user.email, email);
  TestValidator.equals("user has 0 tasks initially", user.tasks_count, 0);
  TestValidator.equals("MFA disabled by default", user.mfa_enabled, false);

  // Step 2: Create tasks to validate the complete workflow
  const currentUrl = "https://test.example.com/todo";
  const currentReferrer = "https://test.example.com/";

  // Test case 1: Normal task creation
  const normalTaskRequest = {
    userId: user.id,
    body: {
      description: "Complete project documentation and submit for review",
      href: currentUrl,
      referrer: currentReferrer,
    } satisfies ITodoTask.ICreate,
  };

  const normalTask = await api.functional.todo.user.users.tasks.create(
    connection,
    normalTaskRequest,
  );
  typia.assert(normalTask);

  TestValidator.equals(
    "task description matches",
    normalTask.description,
    "Complete project documentation and submit for review",
  );
  TestValidator.equals("task completed is false", normalTask.completed, false);
  TestValidator.equals(
    "task business status pending",
    normalTask.business_status,
    "pending",
  );
  TestValidator.equals("task user ID matches", normalTask.user.id, user.id);
  TestValidator.predicate(
    "task has created_at timestamp",
    normalTask.created_at.length > 0,
  );

  // Test case 2: Task with shorter description
  const shortTaskRequest = {
    userId: user.id,
    body: {
      description: "Buy groceries",
      href: currentUrl,
      referrer: currentReferrer,
    } satisfies ITodoTask.ICreate,
  };

  const shortTask = await api.functional.todo.user.users.tasks.create(
    connection,
    shortTaskRequest,
  );
  typia.assert(shortTask);

  TestValidator.equals(
    "short task description",
    shortTask.description,
    "Buy groceries",
  );
  TestValidator.equals(
    "task still pending by default",
    shortTask.business_status,
    "pending",
  );

  // Test case 3: Task with custom business status
  const processingTaskRequest = {
    userId: user.id,
    body: {
      description: "In progress quarterly report",
      business_status: "processing",
      href: currentUrl,
      referrer: currentReferrer,
    } satisfies ITodoTask.ICreate,
  };

  const processingTask = await api.functional.todo.user.users.tasks.create(
    connection,
    processingTaskRequest,
  );
  typia.assert(processingTask);

  TestValidator.equals(
    "custom business status applied",
    processingTask.business_status,
    "processing",
  );

  // Test case 4: Task with maximum description length (500 chars)
  const maxDescription = RandomGenerator.paragraph({
    sentences: 80,
    wordMin: 5,
    wordMax: 8,
  });
  const truncatedMaxDescription = maxDescription.substring(0, 500);

  const maxTaskRequest = {
    userId: user.id,
    body: {
      description: truncatedMaxDescription,
      href: currentUrl,
      referrer: currentReferrer,
    } satisfies ITodoTask.ICreate,
  };

  const maxTask = await api.functional.todo.user.users.tasks.create(
    connection,
    maxTaskRequest,
  );
  typia.assert(maxTask);

  TestValidator.equals(
    "max description length respected",
    maxTask.description.length,
    500,
  );
  TestValidator.predicate(
    "max description content matches",
    maxTask.description === truncatedMaxDescription,
  );

  // Step 3: Task with optional fields
  const optionalTaskRequest = {
    userId: user.id,
    body: {
      description: "Task with optional metadata",
      business_status: "completed",
      ip: "192.168.1.1",
      href: currentUrl,
      referrer: currentReferrer,
    } satisfies ITodoTask.ICreate,
  };

  const optionalTask = await api.functional.todo.user.users.tasks.create(
    connection,
    optionalTaskRequest,
  );
  typia.assert(optionalTask);

  TestValidator.equals(
    "optional business status applies",
    optionalTask.business_status,
    "completed",
  );

  // Step 4: Validate task association with user
  TestValidator.equals(
    "all tasks belong to same user",
    [
      normalTask.user.id,
      shortTask.user.id,
      processingTask.user.id,
      maxTask.user.id,
      optionalTask.user.id,
    ].every((id) => id === user.id),
    true,
  );

  TestValidator.predicate(
    "task user has email",
    normalTask.user.email === user.email,
  );
  TestValidator.equals(
    "task user MFA status",
    normalTask.user.mfa_enabled,
    user.mfa_enabled,
  );
  TestValidator.equals(
    "task user task count updated",
    normalTask.user.tasks_count + shortTask.user.tasks_count > 0,
    true,
  );
}
