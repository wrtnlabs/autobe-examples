import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_todo_task_update_with_valid_data_and_authentication(
  connection: api.IConnection,
) {
  // 1. Register new user
  const email = typia.random<string & tags.Format<"email">>();
  const password = "strongpassword123";
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: { email, password } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);
  TestValidator.predicate(
    "user has valid id",
    typeof user.id === "string" && user.id.length > 0,
  );
  TestValidator.predicate(
    "user has valid access token",
    typeof user.token.access === "string" && user.token.access.length > 0,
  );

  // 2. Create a todo task
  const description1 = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 7,
  }).trim();
  const createBody = {
    description: description1,
  } satisfies ITodoListTask.ICreate;
  const task: ITodoListTask =
    await api.functional.todoList.user.todoListTasks.create(connection, {
      body: createBody,
    });
  typia.assert(task);
  TestValidator.equals(
    "created task description matches input",
    task.description,
    description1,
  );
  TestValidator.equals(
    "created task is not completed",
    task.is_completed,
    false,
  );

  // 3. Update todo task with new description and mark completed
  const description2 = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 10,
  }).trim();
  const updateBody1 = {
    description: description2,
    is_completed: true,
  } satisfies ITodoListTask.IUpdate;
  const updatedTask1: ITodoListTask =
    await api.functional.todoList.user.todoListTasks.update(connection, {
      id: task.id,
      body: updateBody1,
    });
  typia.assert(updatedTask1);
  TestValidator.equals(
    "updated task description matches",
    updatedTask1.description,
    description2,
  );
  TestValidator.equals(
    "updated task is completed",
    updatedTask1.is_completed,
    true,
  );
  TestValidator.equals("update task id unchanged", updatedTask1.id, task.id);
  TestValidator.equals(
    "update task belongs to same user",
    updatedTask1.todo_list_user_id,
    task.todo_list_user_id,
  );

  // 4. Toggle is_completed back to false, keep description unchanged
  const updateBody2 = { is_completed: false } satisfies ITodoListTask.IUpdate;
  const updatedTask2: ITodoListTask =
    await api.functional.todoList.user.todoListTasks.update(connection, {
      id: task.id,
      body: updateBody2,
    });
  typia.assert(updatedTask2);
  TestValidator.equals(
    "toggled task is_completed to false",
    updatedTask2.is_completed,
    false,
  );
  TestValidator.equals(
    "task description unchanged after toggle",
    updatedTask2.description,
    updatedTask1.description,
  );

  // 5. Additional toggle test: mark again completed
  const updateBody3 = { is_completed: true } satisfies ITodoListTask.IUpdate;
  const updatedTask3: ITodoListTask =
    await api.functional.todoList.user.todoListTasks.update(connection, {
      id: task.id,
      body: updateBody3,
    });
  typia.assert(updatedTask3);
  TestValidator.equals(
    "toggled task is_completed to true again",
    updatedTask3.is_completed,
    true,
  );
}
