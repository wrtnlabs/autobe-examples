import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Validate that an authenticated user can retrieve full details of their own
 * todo item by UUID.
 *
 * Scenario:
 *
 * 1. Register a new user.
 * 2. Authenticate as that user (join also logs in).
 * 3. Create a todo as this user (only the owner can retrieve).
 * 4. Retrieve it by ID.
 * 5. Assert all fields, values, and ownership are correct.
 *
 * - Checks that the returned record strictly follows ITodoTodo.
 * - Ensures all privacy is enforced (cannot leak to others).
 * - Confirms ownership and property correctness.
 */
export async function test_api_todo_retrieval_by_owner(
  connection: api.IConnection,
) {
  // 1. Register & authenticate as a new user
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password = RandomGenerator.alphaNumeric(12);
  const href: string & tags.Format<"uri"> = "https://example.com/register";
  const referrer: string & tags.Format<"uri"> = "https://example.com/landing";
  const user: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email,
        password,
        href,
        referrer,
      } satisfies ITodoUser.IJoin,
    },
  );
  typia.assert(user);
  TestValidator.equals("user.email matches", user.email, email);

  // 2. Create a todo as this user
  const todoCreate = {
    title: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 5,
      wordMax: 20,
    }) as string & tags.MinLength<1> & tags.MaxLength<255>,
    description: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 4,
      wordMax: 16,
    }),
  } satisfies ITodoTodo.ICreate;
  const todo: ITodoTodo = await api.functional.todo.user.todos.create(
    connection,
    {
      body: todoCreate,
    },
  );
  typia.assert(todo);
  TestValidator.equals("todo.title matches", todo.title, todoCreate.title);
  TestValidator.equals(
    "todo.description matches",
    todo.description,
    todoCreate.description,
  );
  TestValidator.predicate(
    "todo not completed by default",
    todo.completed === false,
  );
  TestValidator.equals("todo user id matches owner", todo.user.id, user.id);
  TestValidator.equals(
    "todo user email matches owner",
    todo.user.email,
    user.email,
  );
  TestValidator.predicate(
    "todo.created_at exists/update_at exists",
    !!todo.created_at && !!todo.updated_at,
  );
  TestValidator.equals(
    "todo.completed_at is null by default",
    todo.completed_at,
    null,
  );

  // 3. Retrieve the todo by id
  const read: ITodoTodo = await api.functional.todo.user.todos.at(connection, {
    todoId: todo.id,
  });
  typia.assert(read);
  // All field-by-field equality
  TestValidator.equals("retrieved todo.id matches", read.id, todo.id);
  TestValidator.equals("retrieved todo.title matches", read.title, todo.title);
  TestValidator.equals(
    "retrieved todo.description matches",
    read.description,
    todo.description,
  );
  TestValidator.equals(
    "retrieved todo.completed matches",
    read.completed,
    todo.completed,
  );
  TestValidator.equals(
    "retrieved todo.created_at matches",
    read.created_at,
    todo.created_at,
  );
  TestValidator.equals(
    "retrieved todo.updated_at matches",
    read.updated_at,
    todo.updated_at,
  );
  TestValidator.equals(
    "retrieved todo.completed_at matches",
    read.completed_at,
    todo.completed_at,
  );
  TestValidator.equals("retrieved todo.user.id matches", read.user.id, user.id);
  TestValidator.equals(
    "retrieved todo.user.email matches",
    read.user.email,
    user.email,
  );
  TestValidator.equals(
    "retrieved todo.user.created_at matches",
    read.user.created_at,
    user.created_at,
  );
  TestValidator.equals(
    "retrieved todo.user.deleted_at matches",
    read.user.deleted_at,
    user.deleted_at,
  );
}
