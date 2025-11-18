import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validates that an authenticated user can retrieve their own todo by ID.
 *
 * Scenario:
 *
 * 1. Register a new user for the test context.
 * 2. Create a new todo item for the user and capture its ID.
 * 3. Fetch that todo using GET /todoList/user/todos/{todoId} as the authenticated
 *    user.
 * 4. Validate the retrieved fields match the created todo (title, description,
 *    completion status, and audit fields).
 * 5. Ensure retrieved resource is exactly the user's own todo and system-managed
 *    fields are correct.
 */
export async function test_api_todo_list_get_single_by_owner(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const userJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://test.todo.app/register",
    referrer: "https://test.todo.app/landing",
    ip: null,
  } satisfies ITodoListUser.IJoin;
  const authorized = await api.functional.auth.user.join(connection, {
    body: userJoinBody,
  });
  typia.assert(authorized);

  // 2. Create a new todo as the authenticated user
  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 10 }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 10,
    }),
  } satisfies ITodoListTodo.ICreate;
  const created = await api.functional.todoList.user.todos.create(connection, {
    body: todoCreateBody,
  });
  typia.assert(created);

  // 3. Retrieve the todo by its ID (must be owned by the user)
  const fetched = await api.functional.todoList.user.todos.at(connection, {
    todoId: created.id,
  });
  typia.assert(fetched);

  // 4. Validate all fields match between created and fetched todo (ignoring audit fields)
  TestValidator.equals(
    "fetched todo matches created (title)",
    fetched.title,
    created.title,
  );
  TestValidator.equals(
    "fetched todo matches created (description)",
    fetched.description,
    created.description,
  );
  TestValidator.equals(
    "fetched todo is not completed by default",
    fetched.completed,
    false,
  );
  TestValidator.equals(
    "fetched todo completed_at is null",
    fetched.completed_at,
    null,
  );

  // 5. Check audit fields existence and ownership isolation
  TestValidator.equals("todo id matches", fetched.id, created.id);
  TestValidator.predicate(
    "created_at is valid ISO date",
    typeof fetched.created_at === "string" &&
      !isNaN(Date.parse(fetched.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO date",
    typeof fetched.updated_at === "string" &&
      !isNaN(Date.parse(fetched.updated_at)),
  );
}
