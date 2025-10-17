import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_task_retrieval_by_authenticated_user(
  connection: api.IConnection,
) {
  // 1. Authenticate as a user
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
  const taskTitle: string = RandomGenerator.name();
  const taskDescription: string = RandomGenerator.paragraph();
  const taskDeadline: string = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
  const task: ITodoListTask = await api.functional.todoList.user.tasks.create(
    connection,
    {
      body: {
        title: taskTitle,
        description: taskDescription,
        deadline: taskDeadline,
      } satisfies ITodoListTask.ICreate,
    },
  );
  typia.assert(task);

  // 3. Retrieve the task details
  const retrievedTask: ITodoListTask =
    await api.functional.todoList.user.tasks.at(connection, {
      taskId: task.id,
    });
  typia.assert(retrievedTask);

  // 4. Validate the retrieved task details
  TestValidator.equals("task ID matches", retrievedTask.id, task.id);
  TestValidator.equals("task title matches", retrievedTask.title, taskTitle);
  TestValidator.equals(
    "task description matches",
    retrievedTask.description,
    taskDescription,
  );
  TestValidator.equals(
    "task deadline matches",
    retrievedTask.deadline,
    taskDeadline,
  );
  TestValidator.equals(
    "task belongs to authenticated user",
    retrievedTask.todo_list_user_id,
    user.id,
  );

  // 5. Validate timestamps
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(Date.parse(retrievedTask.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date",
    !isNaN(Date.parse(retrievedTask.updated_at)),
  );

  // 6. Validate deadline is in the future
  TestValidator.predicate(
    "deadline is in the future",
    new Date(retrievedTask.deadline!) > new Date(),
  );

  // 7. Validate timestamps are within a reasonable range
  const now = new Date();
  const createdAt = new Date(retrievedTask.created_at);
  const updatedAt = new Date(retrievedTask.updated_at);
  TestValidator.predicate(
    "created_at is within the last hour",
    now.getTime() - createdAt.getTime() <= 3600000,
  );
  TestValidator.predicate(
    "updated_at is within the last hour",
    now.getTime() - updatedAt.getTime() <= 3600000,
  );
}
