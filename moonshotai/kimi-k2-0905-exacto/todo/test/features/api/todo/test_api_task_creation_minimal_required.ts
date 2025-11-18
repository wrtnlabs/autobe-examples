import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test minimal task creation using only required fields.
 *
 * This test validates that the API supports streamlined task creation with only
 * the required fields - title and status. It creates a new user, then creates a
 * minimal task without any optional fields (description, priority, due_date) to
 * ensure the system correctly handles the minimum required data and returns a
 * complete task object structure.
 *
 * The test verifies:
 *
 * 1. Task creation succeeds with only title and status
 * 2. Optional fields receive appropriate null/undefined values
 * 3. Response contains all expected task properties including timestamps
 * 4. The task is properly associated with the authenticated user
 * 5. Default values for optional fields are correct
 */
export async function test_api_task_creation_minimal_required(
  connection: api.IConnection,
) {
  // Step 1: Create user for authentication
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "test1234",
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create minimal task with only required fields
  const taskTitle: string = RandomGenerator.paragraph({ sentences: 3 });
  const createdTask: ITodoAppTask =
    await api.functional.todoApp.user.tasks.create(connection, {
      body: {
        title: taskTitle,
        status: "pending",
      } satisfies ITodoAppTask.ICreate,
    });
  typia.assert(createdTask);

  // Step 3: Validate task was created with expected properties
  TestValidator.equals("task has required title", createdTask.title, taskTitle);
  TestValidator.equals("task status is pending", createdTask.status, "pending");
  TestValidator.equals(
    "task has proper ID format",
    typeof createdTask.id,
    "string",
  );

  // Step 4: Verify optional fields are null/undefined as expected
  TestValidator.equals("description is null", createdTask.description, null);
  TestValidator.equals("priority is null", createdTask.priority, null);
  TestValidator.equals("due_date is null", createdTask.due_date, null);
  TestValidator.equals("completed_at is null", createdTask.completed_at, null);
  TestValidator.equals("deleted_at is null", createdTask.deleted_at, null);

  // Step 5: Validate user association
  TestValidator.equals("task has user info", createdTask.user.email, userEmail);
  TestValidator.equals("task user ID matches", createdTask.user.id, user.id);

  // Step 6: Validate timestamp fields
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(Date.parse(createdTask.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date",
    !isNaN(Date.parse(createdTask.updated_at)),
  );
  TestValidator.notEquals(
    "timestamps differ",
    createdTask.created_at,
    createdTask.updated_at,
  );
}
