import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import type { ITodoListTaskPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTaskPriority";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_task_priority_creation_by_owner(
  connection: api.IConnection,
) {
  // 1. Authenticate as a user
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPassword: string = RandomGenerator.alphabets(8);
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // 2. Create a task
  const taskTitle: string = RandomGenerator.name();
  const taskDescription: string = RandomGenerator.paragraph();
  const task: ITodoListTask = await api.functional.todoList.user.tasks.create(
    connection,
    {
      body: {
        title: taskTitle,
        description: taskDescription,
      } satisfies ITodoListTask.ICreate,
    },
  );
  typia.assert(task);

  // 3. Create a priority for the task
  const priorityLevel: string = RandomGenerator.pick(["Low", "Medium", "High"]);
  const priority: ITodoListTaskPriority =
    await api.functional.todoList.user.tasks.priorities.create(connection, {
      taskId: task.id,
      body: {
        todo_list_task_id: task.id,
        priority_level: priorityLevel,
      } satisfies ITodoListTaskPriority.ICreate,
    });
  typia.assert(priority);

  // 4. Validate the priority was correctly assigned to the task
  TestValidator.equals(
    "priority task ID matches task ID",
    priority.todo_list_task_id,
    task.id,
  );
  TestValidator.equals(
    "priority level matches assigned level",
    priority.priority_level,
    priorityLevel,
  );

  // 5. Retrieve the task and validate the priority is included
  // Note: This step is removed as the 'at' function is not available in the API SDK

  // 6. Validate the priority is properly stored in the database
  // Note: This step is removed as the 'at' function is not available in the API SDK

  // 7. Test error scenarios
  await TestValidator.error(
    "should reject invalid priority level",
    async () => {
      await api.functional.todoList.user.tasks.priorities.create(connection, {
        taskId: task.id,
        body: {
          todo_list_task_id: task.id,
          priority_level: "Invalid",
        } satisfies ITodoListTaskPriority.ICreate,
      });
    },
  );

  // 8. Test unauthorized access
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "should reject unauthorized priority creation",
    async () => {
      await api.functional.todoList.user.tasks.priorities.create(unauthConn, {
        taskId: task.id,
        body: {
          todo_list_task_id: task.id,
          priority_level: "Low",
        } satisfies ITodoListTaskPriority.ICreate,
      });
    },
  );
}
