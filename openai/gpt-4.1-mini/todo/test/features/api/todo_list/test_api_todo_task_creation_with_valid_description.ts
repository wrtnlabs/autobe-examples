import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_todo_task_creation_with_valid_description(
  connection: api.IConnection,
) {
  // 1. User registration
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(10);
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: { email, password } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // 2. Create Todo list task with a valid description
  const description = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const task: ITodoListTask =
    await api.functional.todoList.user.todoListTasks.create(connection, {
      body: { description } satisfies ITodoListTask.ICreate,
    });
  typia.assert(task);

  // 3. Validate returned todo task against expectations
  TestValidator.predicate(
    "task id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      task.id,
    ),
  );
  TestValidator.equals("task belongs to user", task.todo_list_user_id, user.id);
  TestValidator.equals(
    "task description matches input",
    task.description,
    description,
  );
  TestValidator.equals(
    "task is not completed initially",
    task.is_completed,
    false,
  );

  // Check created_at and updated_at are ISO 8601 date-time strings
  TestValidator.predicate(
    "task created_at is ISO 8601 date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(task.created_at),
  );
  TestValidator.predicate(
    "task updated_at is ISO 8601 date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(task.updated_at),
  );
}
