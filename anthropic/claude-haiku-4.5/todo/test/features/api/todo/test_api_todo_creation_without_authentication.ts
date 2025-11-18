import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that todo creation without authentication is rejected.
 *
 * Verifies that attempting to create a todo without providing valid
 * authentication credentials results in an appropriate unauthorized error
 * response (401 or 403). This test ensures the API properly enforces
 * authentication requirements for protected endpoints.
 *
 * Test flow:
 *
 * 1. Create a valid user account to establish authentication context
 * 2. Create an unauthenticated connection with empty headers
 * 3. Attempt to create a todo using the unauthenticated connection
 * 4. Verify that the API rejects the request with an error status
 */
export async function test_api_todo_creation_without_authentication(
  connection: api.IConnection,
) {
  // Step 1: Create a valid user account first
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePassword123!",
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create an unauthenticated connection by clearing headers
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 3 & 4: Attempt to create a todo without authentication
  // and verify it fails with unauthorized error
  await TestValidator.error(
    "todo creation without authentication should be rejected",
    async () => {
      await api.functional.todoList.user.todos.create(unauthConnection, {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          priority: "high",
        } satisfies ITodoListTodo.ICreate,
      });
    },
  );
}
