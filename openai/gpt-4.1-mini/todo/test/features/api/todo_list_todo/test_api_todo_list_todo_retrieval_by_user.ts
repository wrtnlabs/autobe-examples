import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoListUser";

export async function test_api_todo_list_todo_retrieval_by_user(
  connection: api.IConnection,
) {
  // 1. User registration through join operation
  const userCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
  } satisfies ITodoListTodoListUser.ICreate;

  const authorizedUser: ITodoListTodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userCreateBody,
    });
  typia.assert(authorizedUser);

  // 2. Create a todo item
  const createTodoBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 7 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "pending",
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  } satisfies ITodoListTodo.ICreate;

  const createdTodo: ITodoListTodo =
    await api.functional.todoList.user.todoListTodos.create(connection, {
      body: createTodoBody,
    });
  typia.assert(createdTodo);

  // 3. Retrieve the todo item by ID
  const retrievedTodo: ITodoListTodo =
    await api.functional.todoList.user.todoListTodos.at(connection, {
      id: createdTodo.id,
    });
  typia.assert(retrievedTodo);

  // 4. Validate retrieved todo item matches created todo
  TestValidator.equals(
    "todo item id matches",
    retrievedTodo.id,
    createdTodo.id,
  );
  TestValidator.equals(
    "todo item title matches",
    retrievedTodo.title,
    createTodoBody.title,
  );
  TestValidator.equals(
    "todo item description matches",
    retrievedTodo.description,
    createTodoBody.description,
  );

  TestValidator.equals(
    "todo item status matches",
    retrievedTodo.status,
    "pending",
  );

  // Due date is optional, but we provided it - must match
  if (
    createTodoBody.due_date !== null &&
    createTodoBody.due_date !== undefined
  ) {
    TestValidator.equals(
      "todo item due_date matches",
      retrievedTodo.due_date || null,
      createTodoBody.due_date,
    );
  } else {
    TestValidator.equals(
      "todo item due_date is null",
      retrievedTodo.due_date,
      null,
    );
  }

  // Validate timestamps exist and are strings
  TestValidator.predicate(
    "created_at is string",
    typeof retrievedTodo.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at is string",
    typeof retrievedTodo.updated_at === "string",
  );
}
