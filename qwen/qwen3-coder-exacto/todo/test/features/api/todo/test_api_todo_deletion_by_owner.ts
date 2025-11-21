import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUserListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserListUser";
import type { ITodoListUserTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserTodo";

export async function test_api_todo_deletion_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "Password123!";
  const userJoinBody = {
    email: userEmail,
    password: userPassword,
  } satisfies ITodoListUserListUser.IJoin;

  const user: ITodoListUserListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userJoinBody,
    });
  typia.assert(user);
  TestValidator.equals("user email matches", user.email, userEmail);

  // Step 2: Create a todo item for the user
  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITodoListUserTodo.ICreate;

  const todo: ITodoListUserTodo =
    await api.functional.todoList.user.users.todos.create(connection, {
      userId: user.id,
      body: todoCreateBody,
    });
  typia.assert(todo);
  TestValidator.equals("todo title matches", todo.title, todoCreateBody.title);
  TestValidator.equals("todo owner matches", todo.todo_list_user_id, user.id);
  TestValidator.predicate("todo is not deleted", () => !todo.deleted_at);

  // Step 3: Delete the todo item by its owner
  const deletedTodo: ITodoListUserTodo =
    await api.functional.todoList.user.users.todos.erase(connection, {
      userId: user.id,
      todoId: todo.id,
    });
  typia.assert(deletedTodo);

  // Step 4: Verify the deleted todo has populated deleted_at timestamp
  TestValidator.equals("deleted todo ID matches", deletedTodo.id, todo.id);
  TestValidator.equals(
    "deleted todo title matches",
    deletedTodo.title,
    todo.title,
  );
  TestValidator.equals(
    "deleted todo owner matches",
    deletedTodo.todo_list_user_id,
    user.id,
  );
  TestValidator.predicate(
    "deleted todo has deletion timestamp",
    () =>
      deletedTodo.deleted_at !== null &&
      deletedTodo.deleted_at !== undefined &&
      new Date(deletedTodo.deleted_at) instanceof Date,
  );

  // Step 5: Verify that subsequent attempts to retrieve the item return appropriate error responses
  // Note: The scenario doesn't specify a retrieval endpoint, so we can't test this part directly
  // However, we can test that the deletion endpoint properly prevents double deletion
  await TestValidator.error("cannot delete already deleted todo", async () => {
    await api.functional.todoList.user.users.todos.erase(connection, {
      userId: user.id,
      todoId: todo.id,
    });
  });
}
