import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test basic task creation for a new user.
 *
 * This test validates the complete task lifecycle initiation workflow:
 *
 * 1. Create a new user account through user registration
 * 2. Create a simple task with title and status for the authenticated user
 * 3. Verify successful task creation with server-generated timestamps and UUID
 *
 * The test focuses on minimal valid task creation without optional fields to
 * ensure core functionality works correctly and validates that:
 *
 * - User registration creates a valid authenticated session
 * - Task creation endpoint accepts minimal required fields
 * - Server generates proper timestamps and UUID for new tasks
 * - Task ownership is correctly assigned to the creating user
 * - Response includes complete task structure with user summary
 */
export async function test_api_task_creation_simple(
  connection: api.IConnection,
) {
  // Generate random user registration data
  const userEmail =
    RandomGenerator.pick(["test", "demo", "sample"]) +
    RandomGenerator.alphabets(5) +
    "@example.com";

  // Step 1: Create new user account for task ownership
  const newUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "password123",
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/",
    } satisfies ITodoAppUser.ICreate,
  });

  // Validate the user creation response
  typia.assert(newUser);
  TestValidator.predicate(
    "new user has valid email",
    newUser.email === userEmail,
  );
  TestValidator.predicate(
    "new user has valid status",
    newUser.status === "active",
  );
  TestValidator.predicate(
    "new user has valid ID format",
    typia.is<string & tags.Format<"uuid">>(newUser.id),
  );

  // Step 2: Create a simple task for the authenticated user
  const taskTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const taskStatus = "pending"; // Using pending status for new tasks

  const createdTask = await api.functional.todoApp.user.users.tasks.create(
    connection,
    {
      userId: newUser.id,
      body: {
        title: taskTitle,
        status: taskStatus,
      } satisfies ITodoAppTask.ICreate,
    },
  );

  // Validate the task creation response
  typia.assert(createdTask);

  // Step 3: Verify successful task creation with server-generated data
  TestValidator.equals(
    "task title matches request",
    createdTask.title,
    taskTitle,
  );
  TestValidator.equals(
    "task status matches request",
    createdTask.status,
    taskStatus,
  );
  TestValidator.predicate(
    "task has valid ID format",
    typia.is<string & tags.Format<"uuid">>(createdTask.id),
  );
  TestValidator.predicate(
    "task has valid created_at timestamp",
    typia.is<string & tags.Format<"date-time">>(createdTask.created_at),
  );
  TestValidator.predicate(
    "task has valid updated_at timestamp",
    typia.is<string & tags.Format<"date-time">>(createdTask.updated_at),
  );

  // Verify task ownership and user relationship
  TestValidator.equals(
    "task belongs to correct user",
    createdTask.user.id,
    newUser.id,
  );
  TestValidator.equals(
    "task user email matches",
    createdTask.user.email,
    newUser.email,
  );
  TestValidator.equals(
    "task has valid user status",
    createdTask.user.status,
    newUser.status,
  );
  TestValidator.predicate(
    "task description is undefined for minimal creation",
    createdTask.description === undefined || createdTask.description === null,
  );
  TestValidator.predicate(
    "task priority is undefined for minimal creation",
    createdTask.priority === undefined || createdTask.priority === null,
  );
  TestValidator.predicate(
    "task due_date is undefined for minimal creation",
    createdTask.due_date === undefined || createdTask.due_date === null,
  );
  TestValidator.predicate(
    "task completed_at is undefined for pending status",
    createdTask.completed_at === undefined || createdTask.completed_at === null,
  );
  TestValidator.predicate(
    "task deleted_at is null for active task",
    createdTask.deleted_at === null,
  );

  // Verify timestamps are recent and properly formatted
  const now = new Date();
  const createdAt = new Date(createdTask.created_at);
  const updatedAt = new Date(createdTask.updated_at);

  TestValidator.predicate(
    "created_at is recent",
    Math.abs(now.getTime() - createdAt.getTime()) < 3000,
  ); // Within 3 seconds for tighter validation
  TestValidator.predicate(
    "updated_at matches created_at for new task",
    updatedAt.getTime() === createdAt.getTime(),
  );
}
