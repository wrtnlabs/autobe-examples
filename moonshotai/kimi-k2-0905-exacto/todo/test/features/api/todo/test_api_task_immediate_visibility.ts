import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTask";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

export async function test_api_task_immediate_visibility(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: User registration to create authenticated session
  const userEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const user: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "TestPassword123",
      } satisfies ITodoUser.IJoin,
    },
  );
  typia.assert(user);

  // Step 2: Create task with comprehensive data for immediate visibility test
  const taskDescription: string & tags.MaxLength<500> =
    RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 });
  const createdTask: ITodoTask =
    await api.functional.todo.user.users.tasks.create(connection, {
      userId: user.id,
      body: {
        description: taskDescription,
        business_status: "pending",
        href: connection.host,
        referrer: `/user/${user.id}/dashboard`,
      } satisfies ITodoTask.ICreate,
    });
  typia.assert(createdTask);

  // Step 3: Validate immediate visibility - task is returned with all properties
  TestValidator.equals(
    "Task ID assigned immediately",
    typeof createdTask.id,
    "string",
  );
  TestValidator.equals(
    "Task description matches input",
    createdTask.description,
    taskDescription,
  );
  TestValidator.equals(
    "Task completion status is false by default",
    createdTask.completed,
    false,
  );
  TestValidator.equals(
    "Task business status matches input",
    createdTask.business_status,
    "pending",
  );
  TestValidator.equals(
    "Task creation timestamp exists",
    createdTask.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "Task update timestamp exists",
    createdTask.updated_at !== undefined,
    true,
  );
  TestValidator.equals(
    "Task completion timestamp is null",
    createdTask.completed_at,
    null,
  );
  TestValidator.equals(
    "Task user association exists",
    createdTask.user.id,
    user.id,
  );
  TestValidator.equals(
    "Task user email association exists",
    createdTask.user.email,
    user.email,
  );
}
