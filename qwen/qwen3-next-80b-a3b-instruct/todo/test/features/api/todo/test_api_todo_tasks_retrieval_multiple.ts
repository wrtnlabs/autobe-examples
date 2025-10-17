import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import type { ITodoListTaskArray } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTaskArray";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_todo_tasks_retrieval_multiple(
  connection: api.IConnection,
) {
  // 1. Establish user context through join
  const user: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection);
  typia.assert(user);

  // 2. Create first task with completed status
  const firstTask: ITodoListTask = await api.functional.todoList.tasks.create(
    connection,
    {
      body: {
        title: "First task to complete",
      } satisfies ITodoListTask.ICreate,
    },
  );
  typia.assert(firstTask);

  // 3. Create second task with pending status
  const secondTask: ITodoListTask = await api.functional.todoList.tasks.create(
    connection,
    {
      body: {
        title: "Second task pending",
      } satisfies ITodoListTask.ICreate,
    },
  );
  typia.assert(secondTask);

  // 4. Create third task with completed status
  const thirdTask: ITodoListTask = await api.functional.todoList.tasks.create(
    connection,
    {
      body: {
        title: "Third task completed",
      } satisfies ITodoListTask.ICreate,
    },
  );
  typia.assert(thirdTask);

  // 5. Retrieve all tasks
  const retrievedTasks: ITodoListTaskArray =
    await api.functional.todoList.tasks.index(connection);
  typia.assert(retrievedTasks);

  // 6. Validate task order (newest first)
  TestValidator.equals("task count matches created", retrievedTasks.length, 3);
  TestValidator.equals(
    "most recent task title matches",
    retrievedTasks[0].title,
    thirdTask.title,
  );
  TestValidator.equals(
    "middle task title matches",
    retrievedTasks[1].title,
    secondTask.title,
  );
  TestValidator.equals(
    "oldest task title matches",
    retrievedTasks[2].title,
    firstTask.title,
  );

  // 7. Verify each retrieved task has the expected properties (structural validation only)
  TestValidator.equals(
    "first task has correct todo list user ID",
    retrievedTasks[0].todo_list_user_id,
    user.id,
  );
  TestValidator.equals(
    "second task has correct todo list user ID",
    retrievedTasks[1].todo_list_user_id,
    user.id,
  );
  TestValidator.equals(
    "third task has correct todo list user ID",
    retrievedTasks[2].todo_list_user_id,
    user.id,
  );
}
