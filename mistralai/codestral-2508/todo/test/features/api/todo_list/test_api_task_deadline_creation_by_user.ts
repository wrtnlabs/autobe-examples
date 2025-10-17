import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_task_deadline_creation_by_user(
  connection: api.IConnection,
) {
  // 1. User signs up
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

  // 2. User creates a task
  const task: ITodoListTask = await api.functional.todoList.user.tasks.create(
    connection,
    {
      body: {
        title: RandomGenerator.name(),
        description: RandomGenerator.content(),
      } satisfies ITodoListTask.ICreate,
    },
  );
  typia.assert(task);

  // 3. User sets a deadline for the task
  const deadline: string = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
  const updatedTask: ITodoListTask =
    await api.functional.todoList.user.tasks.deadlines.create(connection, {
      taskId: task.id,
      body: {
        deadline: deadline,
      } satisfies ITodoListTask.IDeadline,
    });
  typia.assert(updatedTask);

  // 4. Verify the deadline was set correctly
  TestValidator.equals(
    "deadline was set correctly",
    updatedTask.deadline,
    deadline,
  );

  // 5. Verify the task remains associated with the correct user
  TestValidator.equals(
    "task remains associated with correct user",
    updatedTask.todo_list_user_id,
    user.id,
  );

  // 6. Test failure scenario: Attempt to set deadline with invalid date
  await TestValidator.error("should fail with invalid date", async () => {
    await api.functional.todoList.user.tasks.deadlines.create(connection, {
      taskId: task.id,
      body: {
        deadline: "invalid-date",
      } satisfies ITodoListTask.IDeadline,
    });
  });

  // 7. Test failure scenario: Unauthorized access attempt
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "should fail with unauthorized access",
    async () => {
      await api.functional.todoList.user.tasks.deadlines.create(unauthConn, {
        taskId: task.id,
        body: {
          deadline: deadline,
        } satisfies ITodoListTask.IDeadline,
      });
    },
  );
}
