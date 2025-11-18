import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test creating a basic todo task with just the essential title and default
 * status.
 *
 * This test validates the streamlined workflow for quick task entry by:
 *
 * 1. Creating a new user account for authentication
 * 2. Creating a basic task with only title and status (minimal required fields)
 * 3. Verifying automatic timestamp assignment (created_at and updated_at)
 * 4. Confirming user ownership assignment
 * 5. Ensuring proper task status handling for basic task creation
 * 6. Validating that optional fields are handled correctly
 *
 * The test focuses on the core task creation API endpoint, ensuring that simple
 * task creation works efficiently without requiring optional fields.
 */
export async function test_api_task_create_basic_task(
  connection: api.IConnection,
) {
  // Create user account first
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: "https://example.com/signup",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Create basic task with minimal required fields
  const task = await api.functional.todoApp.user.tasks.create(connection, {
    body: {
      title: RandomGenerator.paragraph({ sentences: 1 }), // Single sentence title
      status: "pending",
    } satisfies ITodoAppTask.ICreate,
  });
  typia.assert(task);

  // Validate core task properties
  TestValidator.equals("task status is pending", task.status, "pending");

  // Verify automatic timestamp assignment
  TestValidator.predicate("has created_at timestamp", task.created_at !== null);
  TestValidator.predicate("has updated_at timestamp", task.updated_at !== null);

  // Validate user ownership assignment
  TestValidator.equals("task belongs to user", task.user.id, user.id);
  TestValidator.equals("user email matches", task.user.email, user.email);

  // Verify optional fields are properly null/undefined for basic task
  TestValidator.predicate(
    "description is nullable",
    task.description === null || task.description === undefined,
  );
  TestValidator.predicate(
    "due_date is nullable",
    task.due_date === null || task.due_date === undefined,
  );
  TestValidator.predicate(
    "completed_at is nullable",
    task.completed_at === null || task.completed_at === undefined,
  );
  TestValidator.predicate(
    "deleted_at is nullable",
    task.deleted_at === null || task.deleted_at === undefined,
  );
  TestValidator.predicate(
    "priority is nullable",
    task.priority === null || task.priority === undefined,
  );
}
