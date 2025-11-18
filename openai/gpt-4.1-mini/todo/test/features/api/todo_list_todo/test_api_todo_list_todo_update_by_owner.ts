import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoListUser";

export async function test_api_todo_list_todo_update_by_owner(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const email = typia.random<string & tags.Format<"email">>();
  const name = RandomGenerator.name();
  const user: ITodoListTodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: { email, name } satisfies ITodoListTodoListUser.ICreate,
    });
  typia.assert(user);

  // 2. Create a todo item as the authenticated user
  const createBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 7 }),
    isComplete: false,
  } satisfies ITodoListTodo.ICreate;
  const todo: ITodoListTodo =
    await api.functional.todoList.user.todoListTodos.create(connection, {
      body: createBody,
    });
  typia.assert(todo);

  // 3. Update the todo item with new values
  const newTitle = RandomGenerator.paragraph({ sentences: 4 });
  const newDescription = RandomGenerator.paragraph({ sentences: 9 });
  const newIsComplete = true;

  const updateBody = {
    title: newTitle,
    description: newDescription,
    isComplete: newIsComplete,
  } satisfies ITodoListTodo.IUpdate;

  const updatedTodo: ITodoListTodo =
    await api.functional.todoList.user.todoListTodos.update(connection, {
      todoListTodoId: todo.id,
      body: updateBody,
    });
  typia.assert(updatedTodo);

  // 4. Validate that the update reflected the changes
  TestValidator.equals(
    "todo id remains same after update",
    updatedTodo.id,
    todo.id,
  );
  TestValidator.equals("title updated correctly", updatedTodo.title, newTitle);
  TestValidator.equals(
    "description updated correctly",
    updatedTodo.description,
    newDescription,
  );
  TestValidator.equals(
    "isComplete updated correctly",
    updatedTodo.isComplete,
    newIsComplete,
  );

  // 5. Validate that updatedAt is updated and after createdAt
  TestValidator.predicate(
    "updatedAt is a later date than createdAt",
    new Date(updatedTodo.updatedAt) > new Date(updatedTodo.createdAt),
  );

  // Note: No soft-delete or non-existent todo update tests here as no explicit delete or get API provided
}
