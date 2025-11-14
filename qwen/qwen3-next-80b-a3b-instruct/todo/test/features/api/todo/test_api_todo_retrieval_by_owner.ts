import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_todo_retrieval_by_owner(
  connection: api.IConnection,
) {
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(user);

  const todo: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    },
  );
  typia.assert(todo);

  const retrievedTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.at(connection, {
      todoId: todo.id,
    });
  typia.assert(retrievedTodo);

  TestValidator.equals(
    "retrieved todo title matches created todo",
    retrievedTodo.title,
    todo.title,
  );
  TestValidator.equals(
    "retrieved todo completion status matches created todo",
    retrievedTodo.completed,
    todo.completed,
  );
  TestValidator.equals(
    "retrieved todo user_id matches authenticated user",
    retrievedTodo.user_id,
    user.id,
  );
  TestValidator.predicate(
    "retrieved todo created_at is valid date-time",
    () => {
      const date = new Date(retrievedTodo.created_at);
      return !isNaN(date.getTime());
    },
  );
  TestValidator.predicate(
    "retrieved todo updated_at is valid date-time",
    () => {
      const date = new Date(retrievedTodo.updated_at);
      return !isNaN(date.getTime());
    },
  );
}
