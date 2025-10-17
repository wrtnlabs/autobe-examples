import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";

/**
 * Ensure Todo creation endpoint enforces authentication.
 *
 * This test verifies that POST /todoList/todos rejects unauthenticated
 * requests. It constructs a valid creation payload (title only) and sends it
 * using a connection without any Authorization header. The call must fail,
 * proving that access control is enforced by the server.
 *
 * Steps:
 *
 * 1. Derive an unauthenticated connection by cloning the given connection and
 *    setting empty headers. Never manipulate headers afterward.
 * 2. Build a valid ITodoListTodo.ICreate body with a single-line title.
 * 3. Call api.functional.todoList.todos.create with the unauthenticated connection
 *    inside TestValidator.error and await it to ensure an error is thrown.
 * 4. Do not assert specific HTTP status codes (401/403); only assert that an error
 *    occurs.
 */
export async function test_api_todo_creation_requires_auth(
  connection: api.IConnection,
) {
  // 1) Create an unauthenticated connection (no Authorization header)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 2) Prepare a valid creation payload
  const createBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 10 }),
  } satisfies ITodoListTodo.ICreate;

  // 3) Expect unauthenticated creation to fail (no status code assertions)
  await TestValidator.error(
    "unauthenticated create must be rejected",
    async () => {
      await api.functional.todoList.todos.create(unauthConn, {
        body: createBody,
      });
    },
  );
}
