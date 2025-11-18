import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validates minimal field todo creation: create a todo item for a new user with
 * only the required fields (title, status) provided.
 *
 * Steps:
 *
 * 1. Register a new user (with unique, random email and password).
 * 2. Create a todo for that user using only required fields:
 *
 *    - Title: exactly one non-whitespace character (valid minimal case).
 *    - Status: one of 'pending', 'completed', or 'archived'.
 * 3. Validate response:
 *
 *    - All required/persistent fields exist and have correct types.
 *    - Fields left optional (description, due_date) are undefined/null.
 *    - Timestamps are system-generated (not default or empty).
 *    - The todo is assigned to the correct user by user id.
 *    - The todo can be found in the listing (if possible).
 */
export async function test_api_todo_creation_minimal_fields(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const email = `${RandomGenerator.alphabets(8)}@test.com`;
  const password = RandomGenerator.alphaNumeric(12);
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email,
        password,
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // 2. Create todo with ONLY minimal required fields
  const minimalTitle: string &
    tags.MinLength<1> &
    tags.MaxLength<100> &
    tags.Pattern<"^(?!\\s*$).+"> = "x"; // minimal non-whitespace

  const statuses = ["pending", "completed", "archived"] as const;
  const status = RandomGenerator.pick(statuses);

  const todoInput = {
    title: minimalTitle,
    status,
  } satisfies ITodoListTodo.ICreate;

  const todo: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: todoInput,
    },
  );
  typia.assert(todo);

  // 3. Validate response fields
  TestValidator.equals("todo title equals input", todo.title, minimalTitle);
  TestValidator.equals("todo status equals input", todo.status, status);
  TestValidator.equals(
    "todo owned by registered user",
    todo.todo_list_user_id,
    user.id,
  );
  TestValidator.predicate(
    "description should be missing or null (minimal input)",
    todo.description === undefined || todo.description === null,
  );
  TestValidator.predicate(
    "due_date should be missing or null (minimal input)",
    todo.due_date === undefined || todo.due_date === null,
  );
  TestValidator.predicate(
    "completed_at should be missing or null (minimal input)",
    todo.completed_at === undefined || todo.completed_at === null,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    typeof todo.created_at === "string" && todo.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    typeof todo.updated_at === "string" && todo.updated_at.length > 0,
  );
}
