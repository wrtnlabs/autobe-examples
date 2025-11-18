import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * E2E test for the happy path of creating a todo item as an authenticated user.
 *
 * Steps:
 *
 * 1. Register a new user with valid, unique email and strong password
 * 2. After authentication, create a todo using POST /todoList/user/todos with a
 *    valid title and description
 * 3. Verify the response contains the expected fields, completed is false,
 *    description matches (or is null if omitted), and timestamps/id are
 *    present
 * 4. Create another todo omitting description and validate system sets description
 *    to null or undefined, completed_at is null/undefined
 */
export async function test_api_todo_list_create_happy_path(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const registerInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    href: "https://app.example.com/register",
    referrer: "https://app.example.com/landing",
    ip: undefined,
  } satisfies ITodoListUser.IJoin;

  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: registerInput,
    },
  );
  typia.assert(user);

  // 2. Create todo with title and description
  const todoInput = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 2, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 7,
      wordMin: 3,
      wordMax: 12,
    }),
  } satisfies ITodoListTodo.ICreate;

  const todo: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: todoInput,
    },
  );
  typia.assert(todo);

  // 3. Validate main todo fields for first todo
  TestValidator.equals("title matches", todo.title, todoInput.title);
  TestValidator.equals(
    "description matches",
    todo.description,
    todoInput.description,
  );
  TestValidator.equals("completed should be false", todo.completed, false);
  TestValidator.predicate(
    "completed_at is null or undefined after creation",
    todo.completed_at === null || todo.completed_at === undefined,
  );
  TestValidator.predicate(
    "created_at is valid iso8601 string",
    typeof todo.created_at === "string" &&
      !Number.isNaN(Date.parse(todo.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid iso8601 string",
    typeof todo.updated_at === "string" &&
      !Number.isNaN(Date.parse(todo.updated_at)),
  );
  TestValidator.predicate(
    "id is valid uuid",
    typeof todo.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        todo.id,
      ),
  );

  // 4. Create todo without description, verify system sets description to null or undefined
  const todoNoDescInput = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 2, wordMax: 8 }),
  } satisfies ITodoListTodo.ICreate;
  const todoNoDesc: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: todoNoDescInput,
    });
  typia.assert(todoNoDesc);
  TestValidator.equals(
    "title matches (no description)",
    todoNoDesc.title,
    todoNoDescInput.title,
  );
  TestValidator.predicate(
    "description is null or undefined when omitted",
    todoNoDesc.description === null || todoNoDesc.description === undefined,
  );
  TestValidator.equals(
    "completed should be false (no desc)",
    todoNoDesc.completed,
    false,
  );
  TestValidator.predicate(
    "completed_at is null or undefined after creation (no desc)",
    todoNoDesc.completed_at === null || todoNoDesc.completed_at === undefined,
  );
  TestValidator.predicate(
    "created_at is valid iso8601 string (no desc)",
    typeof todoNoDesc.created_at === "string" &&
      !Number.isNaN(Date.parse(todoNoDesc.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid iso8601 string (no desc)",
    typeof todoNoDesc.updated_at === "string" &&
      !Number.isNaN(Date.parse(todoNoDesc.updated_at)),
  );
  TestValidator.predicate(
    "id is valid uuid (no desc)",
    typeof todoNoDesc.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        todoNoDesc.id,
      ),
  );
}
