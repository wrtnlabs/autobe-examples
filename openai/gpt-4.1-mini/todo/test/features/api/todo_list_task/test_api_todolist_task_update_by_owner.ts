import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_todolist_task_update_by_owner(
  connection: api.IConnection,
) {
  // 1. User joins and authenticates
  const userAuthorized: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: RandomGenerator.alphaNumeric(10) + "@example.com",
        password: "password123",
        ip: null,
        href: "https://example.com/join",
        referrer: "https://referrer.example.com",
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(userAuthorized);

  // 2. Create a todo list task owned by the joined user
  const taskCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies ITodoListTask.ICreate;

  const createdTask: ITodoListTask =
    await api.functional.todoList.user.todoListTasks.create(connection, {
      body: taskCreateBody,
    });
  typia.assert(createdTask);

  TestValidator.equals(
    "created task title matches",
    createdTask.title,
    taskCreateBody.title,
  );

  // 3. Update the task with new values
  const updatedTitle = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 6,
    wordMax: 12,
  });
  const updatedDescription = RandomGenerator.content({ paragraphs: 2 });
  const updatedIsCompleted = true;
  const nowIso = new Date().toISOString();

  const updateBody = {
    title: updatedTitle,
    description: updatedDescription,
    is_completed: updatedIsCompleted,
    completed_at: nowIso,
    deleted_at: null,
  } satisfies ITodoListTask.IUpdate;

  const updatedTask: ITodoListTask =
    await api.functional.todoList.user.todoListTasks.update(connection, {
      id: createdTask.id,
      body: updateBody,
    });
  typia.assert(updatedTask);

  // 4. Validate updated task fields
  TestValidator.equals(
    "updated task id remains the same",
    updatedTask.id,
    createdTask.id,
  );
  TestValidator.equals(
    "updated task title is updated",
    updatedTask.title,
    updatedTitle,
  );
  TestValidator.equals(
    "updated task description is updated",
    updatedTask.description,
    updatedDescription,
  );
  TestValidator.equals(
    "updated task completion status",
    updatedTask.is_completed,
    updatedIsCompleted,
  );
  TestValidator.equals(
    "updated task completed_at timestamp matches",
    updatedTask.completed_at,
    nowIso,
  );
  TestValidator.equals(
    "updated task deleted_at is null",
    updatedTask.deleted_at,
    null,
  );
}
