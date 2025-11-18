import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_todo_task_retrieval_by_valid_id(
  connection: api.IConnection,
) {
  // Step 1: Authenticate user account to establish ownership context
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePassword123!",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create a new task using the authenticated user's context
  const createdTask: ITodoListTask =
    await api.functional.todoList.user.tasks.create(connection, {
      body: {
        description: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies ITodoListTask.ICreate,
    });
  typia.assert(createdTask);

  // Step 3: Retrieve the created task using its generated ID
  const retrievedTask: ITodoListTask =
    await api.functional.todoList.user.tasks.at(connection, {
      taskId: createdTask.id,
    });
  typia.assert(retrievedTask);

  // Step 4: Validate that retrieved task properties match the originally created task
  // Confirm data isolation: user can only access their own tasks (implicit in authentication context)
  TestValidator.equals("task ID matches", retrievedTask.id, createdTask.id);
  TestValidator.equals(
    "task description matches",
    retrievedTask.description,
    createdTask.description,
  );
  TestValidator.predicate(
    "task completed status is default (undefined)",
    retrievedTask.completed === undefined,
  );
  TestValidator.equals(
    "task created_at matches",
    retrievedTask.created_at,
    createdTask.created_at,
  );
}
