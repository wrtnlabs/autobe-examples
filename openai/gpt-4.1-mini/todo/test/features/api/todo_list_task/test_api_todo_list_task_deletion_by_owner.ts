import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_todo_list_task_deletion_by_owner(
  connection: api.IConnection,
) {
  // 1. Join as a new user to authenticate
  const userCreate = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password: RandomGenerator.alphaNumeric(12),
    href: "https://example.com/join",
    referrer: "https://example.com",
    ip: null,
  } satisfies ITodoListUser.ICreate;

  const authorizedUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userCreate,
    });
  typia.assert(authorizedUser);

  // 2. Create a todo list task
  const todoCreate = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies ITodoListTask.ICreate;

  const createdTask: ITodoListTask =
    await api.functional.todoList.user.todoListTasks.create(connection, {
      body: todoCreate,
    });
  typia.assert(createdTask);

  // 3. Delete the todo list task by ID
  await api.functional.todoList.user.todoListTasks.erase(connection, {
    id: createdTask.id,
  });

  // 4. Attempt to delete the same task again, expect error
  await TestValidator.error(
    "deleting already deleted task should fail",
    async () => {
      await api.functional.todoList.user.todoListTasks.erase(connection, {
        id: createdTask.id,
      });
    },
  );
}
