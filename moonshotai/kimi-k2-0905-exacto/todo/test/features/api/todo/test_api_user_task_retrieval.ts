import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTask";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test the complete task retrieval workflow: create a new user, create a task
 * with description, then retrieve the same task by ID to verify all task
 * properties are correctly returned including description, completion status,
 * business workflow status, and timestamps. This validates the core task
 * management functionality and ensures proper data retrieval post-creation.
 */
export async function test_api_user_task_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account
  const createUserBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ITodoUser.IJoin;

  const user = await api.functional.auth.user.join(connection, {
    body: createUserBody,
  });
  typia.assert(user);

  // Step 2: Create a task with description
  const taskDescription = RandomGenerator.paragraph({ sentences: 3 });
  const validBusinessStatuses = ["pending", "processing", "completed"] as const;

  const createTaskBody = {
    description: taskDescription,
    business_status: RandomGenerator.pick(validBusinessStatuses) as string,
    href: "https://example.com/todo",
    referrer: "https://example.com",
  } satisfies ITodoTask.ICreate;

  const createdTask = await api.functional.todo.user.tasks.create(connection, {
    body: createTaskBody,
  });
  typia.assert(createdTask);

  // Step 3: Retrieve the same task by ID
  const retrievedTask = await api.functional.todo.user.tasks.at(connection, {
    id: createdTask.id,
  });
  typia.assert(retrievedTask);

  // Step 4: Verify all task properties match
  TestValidator.equals("task ID matches", retrievedTask.id, createdTask.id);
  TestValidator.equals(
    "task description matches",
    retrievedTask.description,
    createdTask.description,
  );
  TestValidator.equals(
    "task completion status matches",
    retrievedTask.completed,
    createdTask.completed,
  );
  TestValidator.equals(
    "task business status matches",
    retrievedTask.business_status,
    createdTask.business_status,
  );
  TestValidator.equals("task user ID matches", retrievedTask.user.id, user.id);
  TestValidator.equals(
    "task created_at matches",
    retrievedTask.created_at,
    createdTask.created_at,
  );
  TestValidator.equals(
    "task updated_at matches",
    retrievedTask.updated_at,
    createdTask.updated_at,
  );

  // Step 5: Validate business logic aspects
  TestValidator.predicate(
    "task completion defaults to false",
    createdTask.completed === false,
  );
  TestValidator.predicate(
    "retrieved task completion is false",
    retrievedTask.completed === false,
  );
  TestValidator.predicate(
    "task has valid business status",
    validBusinessStatuses.includes(createdTask.business_status as any),
  );
  TestValidator.predicate(
    "retrieved task has valid business status",
    validBusinessStatuses.includes(retrievedTask.business_status as any),
  );
  TestValidator.predicate(
    "task has user summary",
    retrievedTask.user !== null && retrievedTask.user !== undefined,
  );
  TestValidator.predicate(
    "task timestamps exist",
    createdTask.created_at.length > 0 && createdTask.updated_at.length > 0,
  );
}
