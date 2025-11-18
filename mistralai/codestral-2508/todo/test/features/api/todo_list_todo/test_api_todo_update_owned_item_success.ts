import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Verify that an authenticated user can update their own todo task. Scenario: a
 * user registers (join), creates at least one todo, and then updates the title,
 * description, and completion status of the existing todo. The response should
 * reflect the new values. Validate that business rules on unique incomplete
 * titles, field length, and data type are enforced, and only the owner is
 * allowed to make updates.
 */
export async function test_api_todo_update_owned_item_success(
  connection: api.IConnection,
) {
  // Step 1. Register a new user and authenticate
  const registerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    href: "https://e2e-test/todos/join",
    referrer: "https://e2e-test/ref/source",
    display_name: RandomGenerator.name(2),
  } satisfies ITodoListUser.ICreate;
  const userAuth = await api.functional.auth.user.join(connection, {
    body: registerBody,
  });
  typia.assert(userAuth);
  if (!userAuth.user)
    throw new Error("User profile missing from register response");

  // Step 2. Create the initial todo (random valid values)
  const initialTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 2,
    wordMax: 10,
  }).slice(0, 100) as string & tags.MinLength<1> & tags.MaxLength<100>;
  const initialDescription = RandomGenerator.paragraph({
    sentences: 10,
    wordMin: 3,
    wordMax: 10,
  }).slice(0, 500) as string & tags.MaxLength<500>;
  const createTodoBody = {
    title: initialTitle,
    description: initialDescription,
  } satisfies ITodoListTodo.ICreate;
  const todo = await api.functional.todoList.user.todos.create(connection, {
    body: createTodoBody,
  });
  typia.assert(todo);
  TestValidator.equals(
    "todo created for logged-in user",
    todo.todo_list_user_id,
    userAuth.id,
  );
  TestValidator.equals(
    "todo created with correct title",
    todo.title,
    initialTitle,
  );
  TestValidator.equals(
    "todo created with correct description",
    todo.description,
    initialDescription,
  );
  TestValidator.predicate("todo initially incomplete", !todo.completed);

  // Step 3. Update the todo's title, description, completed state
  const updatedTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 10,
  }).slice(0, 100) as string & tags.MinLength<1> & tags.MaxLength<100>;
  const updatedDescription = RandomGenerator.paragraph({
    sentences: 20,
    wordMin: 2,
    wordMax: 8,
  }).slice(0, 500) as string & tags.MaxLength<500>;
  const updateBody = {
    title: updatedTitle,
    description: updatedDescription,
    completed: true,
  } satisfies ITodoListTodo.IUpdate;
  const updatedTodo = await api.functional.todoList.user.todos.update(
    connection,
    {
      todoId: todo.id,
      body: updateBody,
    },
  );
  typia.assert(updatedTodo);

  // Step 4. Validate that the todo reflects updated values
  TestValidator.equals(
    "updated title returned",
    updatedTodo.title,
    updatedTitle,
  );
  TestValidator.equals(
    "updated description returned",
    updatedTodo.description,
    updatedDescription,
  );
  TestValidator.equals("todo marked completed", updatedTodo.completed, true);
  TestValidator.equals(
    "todo_user_id still matches owner",
    updatedTodo.todo_list_user_id,
    userAuth.id,
  );
  TestValidator.notEquals(
    "updated_at timestamp advanced",
    updatedTodo.updated_at,
    todo.updated_at,
  );
}
