import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test that creating a todo without valid authentication credentials fails
 * appropriately.
 *
 * Validates the authentication enforcement for todo creation by attempting to
 * create a todo with an unauthenticated connection (empty headers). The test
 * verifies that:
 *
 * 1. User account is created successfully through registration
 * 2. Todo creation fails when attempted without authentication token
 * 3. The system properly rejects unauthenticated requests
 * 4. Error handling is appropriate for missing authentication
 *
 * Step-by-step process:
 *
 * 1. Create a user account through registration (auth/user/join)
 * 2. Create an unauthenticated connection with empty headers
 * 3. Attempt to create a todo without authentication credentials
 * 4. Verify the request fails with appropriate error
 * 5. Confirm authentication is properly enforced
 */
export async function test_api_todo_creation_without_authentication(
  connection: api.IConnection,
) {
  // Step 1: Create a user account through registration (setup prerequisite)
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(10),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000/register",
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create an unauthenticated connection with empty headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 3 & 4: Attempt to create a todo without authentication and verify it fails
  await TestValidator.error(
    "todo creation should fail without authentication",
    async () => {
      await api.functional.todoApp.user.todos.create(
        unauthenticatedConnection,
        {
          body: {
            title: RandomGenerator.paragraph({ sentences: 2 }),
            description: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies ITodoAppTodo.ICreate,
        },
      );
    },
  );

  // Step 5: Confirm authentication is properly enforced
  TestValidator.predicate(
    "unauthenticated connection has no authorization header",
    !unauthenticatedConnection.headers?.Authorization,
  );
}
