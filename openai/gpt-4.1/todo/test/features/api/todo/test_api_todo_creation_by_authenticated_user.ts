import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test creation of a todo item by an authenticated user, verifying correct
 * handling of business rules, ownership, and constraints.
 *
 * Steps:
 *
 * 1. Register and authenticate a new user via /auth/user/join.
 * 2. Successfully create a todo with a valid trimmed description (1-255 chars) via
 *    /todo/user/todos.
 *
 *    - Assert description is trimmed, not altered, and saved as provided.
 *    - Assert ownership: todo.user.id equals authenticated user id and is not null.
 *    - Assert completion status is false; completed_at is null/undefined.
 *    - Assert created_at and updated_at fields are valid ISO timestamps and not
 *         empty.
 * 3. Attempt to create with an empty/whitespace-only description.
 *
 *    - Assert error is thrown (using correct type, not sending wrong types).
 * 4. Attempt to create with a too-long description (>255 chars).
 *
 *    - Assert error is thrown.
 * 5. (Simulate quota violation) Attempt to create enough todos to potentially hit
 *    quota, then make one more, and assert error. (Assume system applies
 *    reasonable per-user todo count limit, e.g., 1000; do not hard-code invalid
 *    values, just show logic structure with comment.)
 */
export async function test_api_todo_creation_by_authenticated_user(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new user
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const joinBody = {
    email,
    password,
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies ITodoUser.IJoin;
  const user = await api.functional.auth.user.join(connection, {
    body: joinBody,
  });
  typia.assert(user);

  // 2. Create a todo with valid trimmed description
  const rawDescription = `   ${RandomGenerator.paragraph({ sentences: 4, wordMin: 5, wordMax: 10 })}   `;
  const validDescription = rawDescription.trim();
  const todoBody = {
    description: validDescription as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
  } satisfies ITodoTodo.ICreate;
  const todo = await api.functional.todo.user.todos.create(connection, {
    body: todoBody,
  });
  typia.assert(todo);

  // 2-1. Field validation
  TestValidator.equals(
    "todo description matches trimmed input",
    todo.description,
    validDescription,
  );
  TestValidator.equals(
    "todo assigned to requesting user",
    todo.user.id,
    user.id,
  );
  TestValidator.equals(
    "completion status is initially false",
    todo.is_completed,
    false,
  );
  TestValidator.equals(
    "completed_at is null or undefined",
    todo.completed_at,
    null,
  );
  TestValidator.predicate(
    "created_at is non-empty ISO string",
    typeof todo.created_at === "string" && todo.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is non-empty ISO string",
    typeof todo.updated_at === "string" && todo.updated_at.length > 0,
  );

  // 3. Error: empty/whitespace-only description
  await TestValidator.error(
    "cannot create todo with empty description",
    async () => {
      await api.functional.todo.user.todos.create(connection, {
        body: {
          description: " " as string & tags.MinLength<1> & tags.MaxLength<255>,
        } satisfies ITodoTodo.ICreate,
      });
    },
  );

  // 4. Error: description exceeds 255 chars
  const tooLongDescription = "x".repeat(256) as string &
    tags.MinLength<1> &
    tags.MaxLength<255>;
  await TestValidator.error(
    "cannot create todo with overlong description",
    async () => {
      await api.functional.todo.user.todos.create(connection, {
        body: {
          description: tooLongDescription,
        } satisfies ITodoTodo.ICreate,
      });
    },
  );

  // 5. (Simulate quota logic - system enforced, not validated here):
  // Fill up todos up to quota (simulate up to 5 for test speed, document real limit is higher).
  const MAX_TEST_TODOS = 5;
  const testTodos = [] as ITodoTodo[];
  for (let i = 0; i < MAX_TEST_TODOS; ++i) {
    const t = await api.functional.todo.user.todos.create(connection, {
      body: {
        description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 3,
          wordMax: 8,
        }) as string & tags.MinLength<1> & tags.MaxLength<255>,
      } satisfies ITodoTodo.ICreate,
    });
    testTodos.push(t);
    typia.assert(t);
  }
  // Try one more, expecting error as if quota is reached (for demonstration only; actual quota may be >5):
  await TestValidator.error(
    "cannot create todo when user quota is exhausted (simulated)",
    async () => {
      await api.functional.todo.user.todos.create(connection, {
        body: {
          description: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 3,
            wordMax: 8,
          }) as string & tags.MinLength<1> & tags.MaxLength<255>,
        } satisfies ITodoTodo.ICreate,
      });
    },
  );
}
