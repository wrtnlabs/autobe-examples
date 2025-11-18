import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test basic task creation with required fields only (title and status).
 * Validates successful task creation, proper user assignment, and correct
 * initialization of default values for optional fields. Ensures the response
 * contains the newly created task with all expected properties including
 * generated timestamps and user information.
 *
 * Testing workflow:
 *
 * 1. Create authenticated user context through user registration
 * 2. Create a basic task using only required fields (title and status)
 * 3. Validate the response structure matches expected task schema
 * 4. Verify all required fields are present and properly typed
 * 5. Check that optional fields receive appropriate default values
 * 6. Ensure task is properly assigned to the authenticated user
 */
export async function test_api_task_creation_basic(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user context
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "1234",
        name: RandomGenerator.name(),
        href: "https://example.com/todo",
        referrer: "https://example.com/signup",
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create basic task with only required fields
  const taskData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    status: "pending",
  } satisfies ITodoAppTask.ICreate;

  const createdTask: ITodoAppTask =
    await api.functional.todoApp.user.tasks.create(connection, {
      body: taskData,
    });
  typia.assert(createdTask);

  // Step 3: Validate response structure and required fields
  TestValidator.equals(
    "task title matches input",
    createdTask.title,
    taskData.title,
  );
  TestValidator.equals(
    "task status matches input",
    createdTask.status,
    taskData.status,
  );
  TestValidator.predicate("task has valid ID", () => createdTask.id.length > 0);

  // Step 4: Verify timestamps are generated
  TestValidator.predicate(
    "created_at timestamp exists",
    createdTask.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    createdTask.updated_at !== null,
  );
  TestValidator.equals(
    "timestamps are equal for new task",
    createdTask.created_at,
    createdTask.updated_at,
  );

  // Step 5: Validate user assignment
  TestValidator.equals(
    "task user ID matches authenticated user",
    createdTask.user.id,
    user.id,
  );
  TestValidator.equals(
    "task user email matches authenticated user",
    createdTask.user.email,
    user.email,
  );

  // Step 6: Check optional field defaults - handle nullable types correctly
  TestValidator.predicate(
    "description is nullable",
    createdTask.description === null || createdTask.description === undefined,
  );
  TestValidator.predicate(
    "due_date is nullable",
    createdTask.due_date === null || createdTask.due_date === undefined,
  );
  TestValidator.predicate(
    "priority is nullable",
    createdTask.priority === null || createdTask.priority === undefined,
  );
  TestValidator.equals(
    "completed_at is null for pending tasks",
    createdTask.completed_at,
    null,
  );
  TestValidator.predicate(
    "deleted_at is nullable",
    createdTask.deleted_at === null || createdTask.deleted_at === undefined,
  );
}
