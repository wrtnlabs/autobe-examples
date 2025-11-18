import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_task_creation_success(
  connection: api.IConnection,
) {
  // Create a new user
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        name: RandomGenerator.name(),
        password: "1234",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Create task data with correct types
  const taskData: ITodoListTask.ICreate = {
    title: RandomGenerator.name(),
    dueDate: new Date(Date.now() + 86400000).toISOString().split("T")[0],
    description: RandomGenerator.paragraph(),
    priority: RandomGenerator.pick(["low", "medium", "high"] as const),
  };

  // Create a task under the new user
  const task = await api.functional.todoList.user.tasks.create(connection, {
    body: taskData,
  });
  typia.assert(task);

  // Comprehensive validation of task properties
  TestValidator.equals("task title", task, taskData.title);
  TestValidator.equals("task dueDate", task, taskData.dueDate);
  TestValidator.equals("task description", task, taskData.description);
  TestValidator.equals("task priority", task, taskData.priority);
}
