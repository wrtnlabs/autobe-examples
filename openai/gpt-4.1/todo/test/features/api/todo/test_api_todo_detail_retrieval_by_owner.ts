import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTodouser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodouser";

/**
 * Validate retrieval of todo detail by its owner.
 *
 * 1. Register as a new todoUser.
 * 2. Create a todo for that user (owner).
 * 3. Retrieve the todo by its ID as the authenticated owner.
 * 4. Assert all fields are included and correct, especially ownership and business
 *    audit fields.
 */
export async function test_api_todo_detail_retrieval_by_owner(
  connection: api.IConnection,
) {
  // 1. Register as a todoUser and authenticate session
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string & tags.MinLength<8> = typia.random<
    string & tags.MinLength<8>
  >();
  const joinBody = {
    email,
    password,
    href: "https://test-todo-app.local/register",
    referrer: "https://test-todo-app.local/home",
    ip: null,
  } satisfies ITodoListTodouser.IVerifyJoin;
  const user: ITodoListTodouser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, { body: joinBody });
  typia.assert(user);

  // 2. Create a todo for this user
  const todoBody = {
    title: RandomGenerator.paragraph({ sentences: 1, wordMin: 4, wordMax: 12 }),
    description: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies ITodoListTodo.ICreate;
  const todo: ITodoListTodo =
    await api.functional.todoList.todoUser.todos.create(connection, {
      body: todoBody,
    });
  typia.assert(todo);

  // 3. Fetch the todo detail by ID as owner
  const got: ITodoListTodo = await api.functional.todoList.todoUser.todos.at(
    connection,
    { todoId: todo.id },
  );
  typia.assert(got);

  // 4. Assert core business/domain fields and audit constraints
  TestValidator.equals("todo id matches", got.id, todo.id);
  TestValidator.equals(
    "ownership enforced",
    got.todo_list_todouser_id,
    user.id,
  );
  TestValidator.equals("title matches", got.title, todoBody.title);
  TestValidator.equals(
    "description matches",
    got.description,
    todoBody.description,
  );
  TestValidator.equals(
    "is_completed is false on new todo",
    got.is_completed,
    false,
  );
  TestValidator.predicate(
    "created_at is valid ISO string",
    typeof got.created_at === "string" && got.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid ISO string",
    typeof got.updated_at === "string" && got.updated_at.length > 0,
  );
  TestValidator.equals(
    "completed_at must be null for incomplete todo",
    got.completed_at,
    null,
  );
}
