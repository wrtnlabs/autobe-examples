import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListTask";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_todo_task_filter_by_completion_status(
  connection: api.IConnection,
) {
  const user1 = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user1);
  const connection1 = {
    ...connection,
    headers: { Authorization: user1.token.access },
  };

  // Create mixed tasks: 2 completed, 2 pending
  const completedTask1 = await api.functional.todoList.user.tasks.create(
    connection1,
    {
      body: { description: "Completed Task 1" } satisfies ITodoListTask.ICreate,
    },
  );
  typia.assert(completedTask1);
  const completedTask2 = await api.functional.todoList.user.tasks.create(
    connection1,
    {
      body: { description: "Completed Task 2" } satisfies ITodoListTask.ICreate,
    },
  );
  typia.assert(completedTask2);

  const pendingTask1 = await api.functional.todoList.user.tasks.create(
    connection1,
    { body: { description: "Pending Task 1" } satisfies ITodoListTask.ICreate },
  );
  typia.assert(pendingTask1);
  const pendingTask2 = await api.functional.todoList.user.tasks.create(
    connection1,
    { body: { description: "Pending Task 2" } satisfies ITodoListTask.ICreate },
  );
  typia.assert(pendingTask2);

  // Test completed=true filter
  const responseCompletedTrue = await api.functional.todoList.user.tasks.index(
    connection1,
    { body: "true" satisfies ITodoListTask.IRequest },
  );
  typia.assert(responseCompletedTrue);
  TestValidator.equals(
    "completed=true returns only completed tasks",
    responseCompletedTrue.data.length,
    2,
  );
  // Verify these are the correct tasks
  responseCompletedTrue.data.forEach((task) => {
    TestValidator.predicate("task has completed=true", task.completed === true);
    TestValidator.predicate(
      'task description contains "Completed"',
      task.description.includes("Completed"),
    );
  });

  // Test completed=false filter
  const responseCompletedFalse = await api.functional.todoList.user.tasks.index(
    connection1,
    { body: "false" satisfies ITodoListTask.IRequest },
  );
  typia.assert(responseCompletedFalse);
  TestValidator.equals(
    "completed=false returns only pending tasks",
    responseCompletedFalse.data.length,
    2,
  );
  // Verify these are the correct tasks
  responseCompletedFalse.data.forEach((task) => {
    TestValidator.predicate(
      "task has completed=false",
      task.completed === false,
    );
    TestValidator.predicate(
      'task description contains "Pending"',
      task.description.includes("Pending"),
    );
  });

  // Verify data isolation with new user
  const user2 = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user2);
  const connection2 = {
    ...connection,
    headers: { Authorization: user2.token.access },
  };
  const responseUser2 = await api.functional.todoList.user.tasks.index(
    connection2,
    { body: "true" satisfies ITodoListTask.IRequest },
  );
  typia.assert(responseUser2);
  TestValidator.equals(
    "user2 should have 0 completed tasks",
    responseUser2.data.length,
    0,
  );
}
