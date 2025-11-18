import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppCategory";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test the minimalist task creation workflow validating the rapid capture
 * philosophy. This test demonstrates that users can create actionable tasks
 * with only a title, ensuring the API supports immediate task capture without
 * mandatory planning overhead.
 *
 * Test validates the following behaviors:
 *
 * 1. User authentication prerequisite for task operations
 * 2. Task creation with minimal required information (title only)
 * 3. API returns complete task object with defaulted values
 * 4. Optional fields remain null/undefined when not provided
 * 5. Task ownership is properly assigned to authenticated user
 *
 * The test emphasizes the rapid capture philosophy where complex planning can
 * be deferred to later update operations, supporting immediate productivity.
 */
export async function test_api_task_creation_minimal(
  connection: api.IConnection,
) {
  // Step 1: Create a new user to establish authentication context
  const userData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://example.com/join",
    referrer: "https://example.com/home",
  } satisfies ITodoAppUser.IJoin;

  const authorizedUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: userData });
  typia.assert(authorizedUser);

  TestValidator.predicate(
    "user authenticated successfully",
    authorizedUser.id !== null,
  );
  TestValidator.predicate(
    "authorization token issued",
    authorizedUser.token.access.length > 0,
  );

  // Step 2: Create task with absolute minimal data - only title required
  const taskTitle = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 2,
    wordMax: 8,
  });
  const taskCreateData = { title: taskTitle } satisfies ITodoAppTask.ICreate;

  const createdTask: ITodoAppTask =
    await api.functional.todoApp.user.tasks.create(connection, {
      body: taskCreateData,
    });
  typia.assert(createdTask);

  // Step 3: Validate core task properties match input
  TestValidator.equals(
    "created task title matches",
    createdTask.title,
    taskTitle,
  );
  TestValidator.predicate("task has valid ID", createdTask.id !== null);
  TestValidator.predicate("task has owner", createdTask.user.id !== null);

  // Step 4: Verify rapid capture philosophy - all optional fields null/undefined
  TestValidator.predicate(
    "description optional",
    createdTask.description === null || createdTask.description === undefined,
  );
  TestValidator.predicate(
    "category optional",
    createdTask.category === null || createdTask.category === undefined,
  );
  TestValidator.predicate(
    "due date optional",
    createdTask.due_date === null || createdTask.due_date === undefined,
  );

  // Step 5: Validate defaulted system-provided values
  TestValidator.equals("default priority Low", createdTask.priority, "Low");
  TestValidator.equals("default status pending", createdTask.status, "pending");
  TestValidator.predicate(
    "order number set",
    Number.isInteger(createdTask.completion_order),
  );
  TestValidator.predicate(
    "timestamps created",
    createdTask.created_at !== null,
  );
  TestValidator.predicate(
    "timestamps updated",
    createdTask.updated_at !== null,
  );

  // Step 6: Verify ownership integrity
  TestValidator.equals(
    "task owner matches auth user",
    createdTask.user.id,
    authorizedUser.id,
  );
  TestValidator.equals(
    "user email consistency",
    createdTask.user.email,
    authorizedUser.email,
  );

  TestValidator.predicate(
    "task ready for later updates",
    createdTask.description === null,
  );
}
