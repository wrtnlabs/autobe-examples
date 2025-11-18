import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_retrieve_by_id_bot_detection(
  connection: api.IConnection,
) {
  // 1. Create a new user account to use for testing
  const joinEmail: string = typia.random<string & tags.Format<"email">>();
  const joinPassword: string = "SecurePassword123!";

  const joinedUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: joinEmail,
        password: joinPassword,
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(joinedUser);

  // 2. Verify we have a valid user ID from the join response
  const userId: string = joinedUser.id;
  TestValidator.equals("user ID is a valid UUID", userId, userId);

  // 3. Attempt to retrieve the user by ID - this should succeed with valid access
  const retrievedUser: ITodoListUser =
    await api.functional.todoList.user.actors.at(connection, {
      userId: userId,
    });
  typia.assert(retrievedUser);
  TestValidator.equals(
    "retrieved user ID matches created user",
    retrievedUser,
    userId,
  );

  // 4. Create a fresh connection to simulate an unauthenticated bot request
  // This simulates a headless browser or scraper that doesn't have proper auth
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 5. Attempt to retrieve the user with unauthenticated connection - this should FAIL
  // Our system must detect and block bot automation requests
  await TestValidator.error(
    "unauthenticated bot access should be blocked",
    async () => {
      await api.functional.todoList.user.actors.at(unauthenticatedConnection, {
        userId: userId,
      });
    },
  );
}
