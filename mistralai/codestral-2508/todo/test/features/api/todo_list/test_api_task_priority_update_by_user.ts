import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import type { ITodoListTaskPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTaskPriority";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_task_priority_update_by_user(
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

  // 2. Create a task
  const task: ITodoListTask = await api.functional.todoList.user.tasks.create(
    connection,
    {
      body: {
        title: RandomGenerator.name(),
        description: RandomGenerator.content(),
        deadline: new Date(Date.now() + 86400000).toISOString(),
      } satisfies ITodoListTask.ICreate,
    },
  );
  typia.assert(task);

  // 3. Set initial priority for the task
  const initialPriority: ITodoListTaskPriority =
    await api.functional.todoList.user.tasks.priorities.create(connection, {
      taskId: task.id,
      body: {
        todo_list_task_id: task.id,
        priority_level: "Medium",
      } satisfies ITodoListTaskPriority.ICreate,
    });
  typia.assert(initialPriority);

  // 4. Update the task priority
  const updatedPriority: ITodoListTaskPriority =
    await api.functional.todoList.user.tasks.priorities.update(connection, {
      taskId: task.id,
      body: {
        priority_level: "High",
      } satisfies ITodoListTaskPriority.IUpdate,
    });
  typia.assert(updatedPriority);

  // 5. Validate the priority was updated correctly
  TestValidator.equals(
    "priority level should be updated",
    updatedPriority.priority_level,
    "High",
  );

  // 6. Validate the task remains associated with the correct user
  TestValidator.equals(
    "task should remain associated with the correct user",
    updatedPriority.todo_list_task_id,
    task.id,
  );

  // 7. Test unauthorized access attempt
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized user should not be able to update priority",
    async () => {
      await api.functional.todoList.user.tasks.priorities.update(unauthConn, {
        taskId: task.id,
        body: {
          priority_level: "Low",
        } satisfies ITodoListTaskPriority.IUpdate,
      });
    },
  );

  // 8. Test invalid priority value attempt
  await TestValidator.error(
    "invalid priority value should be rejected",
    async () => {
      await api.functional.todoList.user.tasks.priorities.update(connection, {
        taskId: task.id,
        body: {
          priority_level: "Invalid",
        } satisfies ITodoListTaskPriority.IUpdate,
      });
    },
  );
}
