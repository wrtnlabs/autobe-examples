import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_todo_retrieval_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user context
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userAuth: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: RandomGenerator.alphabets(12),
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(userAuth);

  // Step 2: Create a todo item for the authenticated user
  const todoText: string = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 8,
  });
  const todo: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        text: todoText,
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(todo);
  TestValidator.equals("todo item text matches", todo.text, todoText);

  // Step 3: Retrieve the todo item by its ID
  const retrievedTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.at(connection, {
      todoId: todo.id,
    });
  typia.assert(retrievedTodo);

  // Step 4: Validate the retrieved todo item matches the created one
  TestValidator.equals("retrieved todo id matches", retrievedTodo.id, todo.id);
  TestValidator.equals(
    "retrieved todo text matches",
    retrievedTodo.text,
    todo.text,
  );
  TestValidator.equals(
    "retrieved todo completed status matches",
    retrievedTodo.completed,
    todo.completed,
  );
  typia.assert(retrievedTodo.created_at);
  typia.assert(retrievedTodo.updated_at);

  // Verify the system correctly enforces ownership by switching to a new user and attempting to access
  const anotherUserEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const anotherUserAuth: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: anotherUserEmail,
        password: RandomGenerator.alphabets(12),
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(anotherUserAuth);

  // Attempt to access the todo item created by the first user (should fail)
  await TestValidator.error("other user cannot access todo", async () => {
    await api.functional.todoList.user.todos.at(connection, {
      todoId: todo.id,
    });
  });
}
