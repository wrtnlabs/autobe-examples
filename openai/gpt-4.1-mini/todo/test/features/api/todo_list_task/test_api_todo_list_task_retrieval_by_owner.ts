import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_todo_list_task_retrieval_by_owner(
  connection: api.IConnection,
) {
  // 1. User registration
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";
  const userRegisterBody = {
    email: userEmail,
    password: userPassword,
    href: "https://example.com/register",
    referrer: "https://example.com",
  } satisfies ITodoListUser.ICreate;

  const authorizedUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userRegisterBody,
    });
  typia.assert(authorizedUser);

  // 2. Create todo list task
  const todoTaskCreateBody = {
    title: "Test Todo Task",
    description: "This task is created for e2e testing.",
  } satisfies ITodoListTask.ICreate;

  const createdTodoTask: ITodoListTask =
    await api.functional.todoList.user.todoListTasks.create(connection, {
      body: todoTaskCreateBody,
    });
  typia.assert(createdTodoTask);

  // 3. Retrieve the created task by task ID
  const retrievedTask: ITodoListTask =
    await api.functional.todoList.user.todoListTasks.at(connection, {
      id: createdTodoTask.id,
    });
  typia.assert(retrievedTask);

  // 4. Validate retrieved task matches created task
  TestValidator.equals(
    "Retrieved task ID matches created task ID",
    retrievedTask.id,
    createdTodoTask.id,
  );
  TestValidator.equals(
    "Retrieved task title matches",
    retrievedTask.title,
    todoTaskCreateBody.title,
  );
  TestValidator.equals(
    "Retrieved task description matches",
    retrievedTask.description ?? null,
    todoTaskCreateBody.description ?? null,
  );
  TestValidator.equals(
    "Retrieved task completion status is initially false",
    retrievedTask.is_completed,
    false,
  );
  TestValidator.predicate(
    "Retrieved task created_at is valid ISO date",
    typeof retrievedTask.created_at === "string" &&
      retrievedTask.created_at.length > 0,
  );
  TestValidator.predicate(
    "Retrieved task updated_at is valid ISO date",
    typeof retrievedTask.updated_at === "string" &&
      retrievedTask.updated_at.length > 0,
  );
  TestValidator.equals(
    "Retrieved task completed_at is null initially",
    retrievedTask.completed_at ?? null,
    null,
  );
  TestValidator.equals(
    "Retrieved task deleted_at is null initially",
    retrievedTask.deleted_at ?? null,
    null,
  );
}
