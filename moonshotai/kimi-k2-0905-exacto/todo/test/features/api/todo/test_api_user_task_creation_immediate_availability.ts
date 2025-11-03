import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTask";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

export async function test_api_user_task_creation_immediate_availability(
  connection: api.IConnection,
) {
  // Step 1: User Registration - Create authenticated user context for testing immediate task availability
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "12345678",
    } satisfies ITodoUser.IJoin,
  });
  typia.assert(user);

  // Step 2: Create immediate task with comprehensive tracking metadata
  const taskDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 12,
  });
  const currentHref = "https://example.com/todo-app";
  const currentReferrer = "https://example.com/";

  const createdTask = await api.functional.todo.user.tasks.create(connection, {
    body: {
      description: taskDescription,
      business_status: "pending",
      href: currentHref,
      referrer: currentReferrer,
      ip: "127.0.0.1",
    } satisfies ITodoTask.ICreate,
  });
  typia.assert(createdTask);

  // Step 3: Immediate validation - verify complete task object without delays
  TestValidator.equals(
    "created task description matches input",
    createdTask.description,
    taskDescription,
  );
  TestValidator.equals(
    "created task completion status is false",
    createdTask.completed,
    false,
  );
  TestValidator.equals(
    "created task business status matches input",
    createdTask.business_status,
    "pending",
  );
  TestValidator.equals(
    "created task completion timestamp is null",
    createdTask.completed_at,
    null,
  );

  // Step 4: Validate immediate data structure and timestamps
  TestValidator.predicate(
    "created task has valid creation timestamp",
    createdTask.created_at !== null,
  );
  TestValidator.predicate(
    "created task has valid update timestamp",
    createdTask.updated_at !== null,
  );

  // Step 5: User association validation - verify immediate association
  TestValidator.equals(
    "created task associated with correct user ID",
    createdTask.user.id,
    user.id,
  );
  TestValidator.equals(
    "created task associated with correct user email",
    createdTask.user.email,
    userEmail,
  );

  // Step 6: Data completeness validation - all fields present and properly typed
  TestValidator.predicate(
    "created task has non-empty description",
    createdTask.description.length > 0,
  );
  TestValidator.predicate(
    "created task description under limit",
    createdTask.description.length <= 500,
  );

  // Step 7: Immediate availability validation - task fully accessible
  TestValidator.predicate(
    "task created without processing delays",
    createdTask.description !== "" &&
      createdTask.user.id.length > 0 &&
      createdTask.user.email === userEmail,
  );
}
