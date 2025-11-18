import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_todo_task_deletion_by_owner(
  connection: api.IConnection,
) {
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Password123!",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  const task: ITodoListTask = await api.functional.todoList.user.tasks.create(
    connection,
    {
      body: {
        description: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 8,
        }),
      } satisfies ITodoListTask.ICreate,
    },
  );
  typia.assert(task);

  await api.functional.todoList.user.tasks.erase(connection, {
    taskId: task.id,
  });

  await TestValidator.httpError(
    "deleting non-existent task should return 404",
    404,
    async () => {
      await api.functional.todoList.user.tasks.erase(connection, {
        taskId: task.id,
      });
    },
  );
}
