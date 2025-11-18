import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_todo_task_retrieval_by_invalid_id(
  connection: api.IConnection,
) {
  // Step 1: Authenticate user to establish ownership context
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "validPassword123!",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Verify that attempting to retrieve a non-existent taskId returns 404 error
  // Generate a valid UUID format but non-existent task ID
  const nonExistentTaskId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  // Verify that retrieving a task with non-existent ID returns error
  await TestValidator.error(
    "retrieving non-existent task should return 404 error",
    async () => {
      await api.functional.todoList.user.tasks.at(connection, {
        taskId: nonExistentTaskId,
      });
    },
  );
}
