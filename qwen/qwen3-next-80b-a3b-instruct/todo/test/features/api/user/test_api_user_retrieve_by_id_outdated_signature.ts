import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_retrieve_by_id_outdated_signature(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const password: string = "SecurePassword123!";

  const joinResponse: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: password,
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(joinResponse);

  // Step 2: Extract user ID
  const userId: string = joinResponse.id;

  // Step 3: Successfully retrieve user account with authenticated connection
  // This verifies proper authentication works
  const authenticatedUser: ITodoListUser =
    await api.functional.todoList.user.actors.at(connection, {
      userId: userId,
    });
  typia.assert(authenticatedUser);
  TestValidator.equals(
    "retrieved user ID matches created user",
    authenticatedUser,
    userId,
  );

  // Step 4: Create an unauthenticated connection (empty headers)
  const unauthConn: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 5: Attempt to retrieve the user account without authentication
  // This should fail as the system requires valid authentication
  await TestValidator.error(
    "system should reject unauthorized access attempts",
    async () => {
      await api.functional.todoList.user.actors.at(unauthConn, {
        userId: userId,
      });
    },
  );
}
