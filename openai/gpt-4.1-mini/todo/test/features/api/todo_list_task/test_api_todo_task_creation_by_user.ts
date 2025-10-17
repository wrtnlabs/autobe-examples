import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_todo_task_creation_by_user(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const userCreateBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password: "P@ssw0rd!",
  } satisfies ITodoListUser.ICreate;
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: userCreateBody,
    },
  );
  typia.assert(user);

  // 2. Create a new todo task with valid non-empty description
  const todoDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 8,
  });
  const todoCreateBody = {
    description: todoDescription,
  } satisfies ITodoListTask.ICreate;
  const todoTask: ITodoListTask =
    await api.functional.todoList.user.todoListTasks.create(connection, {
      body: todoCreateBody,
    });
  typia.assert(todoTask);

  TestValidator.equals(
    "Todo task description should match input",
    todoTask.description,
    todoDescription,
  );
  TestValidator.equals(
    "Todo task is_completed should be false initially",
    todoTask.is_completed,
    false,
  );

  // 3. Confirm task has valid UUID id
  TestValidator.predicate(
    "Todo task id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      todoTask.id,
    ),
  );

  // 4. Confirm created_at and updated_at have valid ISO date-time format
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
  TestValidator.predicate(
    "Todo task created_at ISO format",
    isoDateRegex.test(todoTask.created_at),
  );
  TestValidator.predicate(
    "Todo task updated_at ISO format",
    isoDateRegex.test(todoTask.updated_at),
  );

  // 5. Confirm that unauthorized user cannot create task
  // Create new connection with empty headers to simulate unauthenticated
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "Unauthenticated creation should fail",
    async () => {
      await api.functional.todoList.user.todoListTasks.create(unauthConn, {
        body: todoCreateBody,
      });
    },
  );

  // 6. Confirm that empty description is rejected (empty string)
  const emptyDescBody1 = { description: "" } satisfies ITodoListTask.ICreate;
  await TestValidator.error(
    "Empty todo task description should fail",
    async () => {
      await api.functional.todoList.user.todoListTasks.create(connection, {
        body: emptyDescBody1,
      });
    },
  );

  // 7. Confirm that description with only whitespace is rejected (e.g. spaces)
  const emptyDescBody2 = {
    description: "    ",
  } satisfies ITodoListTask.ICreate;
  await TestValidator.error(
    "Whitespace-only todo task description should fail",
    async () => {
      await api.functional.todoList.user.todoListTasks.create(connection, {
        body: emptyDescBody2,
      });
    },
  );
}
