import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Confirm that unauthenticated users are prevented from creating todo items.
 *
 * 1. Construct a new (empty) connection object to simulate an unauthenticated
 *    session—no tokens or user credentials present.
 * 2. Attempt to create a todo item using valid title and (optional) description.
 * 3. The todo creation request must fail due to authentication enforcement.
 * 4. Assert via TestValidator.error that an error is thrown when unauthenticated
 *    users invoke the create endpoint.
 * 5. Do not test type errors or missing fields—focus only on the business
 *    logic/authentication error.
 */
export async function test_api_todo_creation_requires_authentication(
  connection: api.IConnection,
) {
  // 1. Create an unauthenticated connection by removing any headers
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  // 2. Prepare valid todo creation data
  const todoBody = {
    title: RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 10 }),
    description: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 5,
      wordMax: 20,
    }),
  } satisfies ITodoListTodo.ICreate;
  // 3. Attempt todo creation and expect error due to lack of authentication
  await TestValidator.error(
    "creating a todo without authentication must fail",
    async () => {
      await api.functional.todoList.user.todos.create(unauthConnection, {
        body: todoBody,
      });
    },
  );
}
