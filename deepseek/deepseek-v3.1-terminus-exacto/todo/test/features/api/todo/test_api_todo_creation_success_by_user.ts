import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate successful creation of a todo item by a new authenticated user.
 *
 * Flow:
 *
 * 1. Register as new end user (user join)
 * 2. Create a todo as this user (POST /todoList/user/todos) using valid data
 * 3. Validate response: owner, timestamps, business rules, computed fields
 */
export async function test_api_todo_creation_success_by_user(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const email: string = typia.random<
    string & tags.Format<"email"> & tags.MinLength<3> & tags.MaxLength<255>
  >();
  const password: string = typia.random<
    string & tags.Format<"password"> & tags.MinLength<8> & tags.MaxLength<72>
  >();
  const createUserBody = {
    email,
    password,
  } satisfies ITodoListUser.ICreate;
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: createUserBody },
  );
  typia.assert(user);
  TestValidator.equals("email matches", user.email, email);
  TestValidator.predicate(
    "token access present",
    typeof user.token.access === "string" && user.token.access.length > 0,
  );
  TestValidator.predicate(
    "created_at present",
    typeof user.created_at === "string" && user.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at present",
    typeof user.updated_at === "string" && user.updated_at.length > 0,
  );
  TestValidator.equals(
    "locked should be false on new account",
    user.locked,
    false,
  );

  // 2. Create a todo for this authenticated user
  // due_date: pick a future time (now + 1 day)
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const futureDue = new Date(now.getTime() + oneDayMs);
  const createTodoBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    status: "pending",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    due_date: futureDue.toISOString(),
  } satisfies ITodoListTodo.ICreate;
  const todo: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    { body: createTodoBody },
  );
  typia.assert(todo);

  // 3. Validate properties and ownership
  TestValidator.equals(
    "owner is the authenticated user",
    todo.todo_list_user_id,
    user.id,
  );
  TestValidator.equals("title matches", todo.title, createTodoBody.title);
  TestValidator.equals("status matches", todo.status, createTodoBody.status);
  TestValidator.equals(
    "description matches",
    todo.description,
    createTodoBody.description,
  );
  TestValidator.equals(
    "due_date matches",
    todo.due_date,
    createTodoBody.due_date,
  );
  TestValidator.predicate(
    "created_at present",
    typeof todo.created_at === "string" && todo.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at present",
    typeof todo.updated_at === "string" && todo.updated_at.length > 0,
  );
  TestValidator.equals(
    "completed_at should be null for pending",
    todo.completed_at,
    null,
  );

  // 4. Ensure UUID and date fields are conformant and id is unique
  TestValidator.predicate(
    "id is uuid",
    !!todo.id &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        todo.id,
      ),
  );
  TestValidator.predicate(
    "timestamps are ISO format",
    /T.*Z$/.test(todo.created_at) && /T.*Z$/.test(todo.updated_at),
  );
}
