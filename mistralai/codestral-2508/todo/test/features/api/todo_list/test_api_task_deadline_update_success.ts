import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_task_deadline_update_success(
  connection: api.IConnection,
) {
  // 1. Authenticate as user
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "1234",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // 2. Create task with initial deadline
  const initialDeadline: string = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
  const task: ITodoListTask = await api.functional.todoList.user.tasks.create(
    connection,
    {
      body: {
        title: RandomGenerator.name(),
        description: RandomGenerator.content(),
        deadline: initialDeadline,
      } satisfies ITodoListTask.ICreate,
    },
  );
  typia.assert(task);

  // 3. Update task deadline to a future date
  const newDeadline: string = new Date(Date.now() + 172800000).toISOString(); // Day after tomorrow
  const updatedTask: ITodoListTask =
    await api.functional.todoList.user.tasks.deadlines.update(connection, {
      taskId: task.id,
      body: {
        deadline: newDeadline,
      } satisfies ITodoListTask.IDeadline,
    });
  typia.assert(updatedTask);

  // 4. Validate deadline update
  TestValidator.equals(
    "deadline should be updated to new deadline",
    updatedTask.deadline,
    newDeadline,
  );
  TestValidator.notEquals(
    "deadline should not be the initial deadline",
    updatedTask.deadline,
    initialDeadline,
  );
  TestValidator.equals(
    "task information should remain the same",
    {
      id: updatedTask.id,
      title: updatedTask.title,
      description: updatedTask.description,
    },
    {
      id: task.id,
      title: task.title,
      description: task.description,
    },
  );

  // 5. Validate error handling for invalid deadline update
  await TestValidator.error(
    "should reject invalid deadline update",
    async () => {
      await api.functional.todoList.user.tasks.deadlines.update(connection, {
        taskId: task.id,
        body: {
          deadline: "invalid-date",
        } satisfies ITodoListTask.IDeadline,
      });
    },
  );
}
