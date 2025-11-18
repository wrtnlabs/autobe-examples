import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_todo_task_retrieval_by_other_users_task(
  connection: api.IConnection,
) {
  const user1: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "StrongPassword123!",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user1);

  const task: ITodoListTask = await api.functional.todoList.user.tasks.create(
    connection,
    {
      body: {
        description: RandomGenerator.paragraph(),
      } satisfies ITodoListTask.ICreate,
    },
  );
  typia.assert(task);

  // Re-authenticate with user2 on the same connection - SDK automatically updates headers
  const user2: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "StrongPassword456!",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user2);

  // Now try to retrieve user1's task with user2's credentials - should fail with 404 error
  await TestValidator.error("user2 cannot retrieve user1's task", async () => {
    await api.functional.todoList.user.tasks.at(connection, {
      taskId: task.id,
    });
  });
}
