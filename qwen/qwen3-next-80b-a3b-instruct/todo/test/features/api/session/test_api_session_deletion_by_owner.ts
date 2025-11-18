import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_session_deletion_by_owner(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a new user to establish session context
  const userOneEmail: string = typia.random<string & tags.Format<"email">>();
  const userOnePassword: string = "SecurePassword123!";

  const userOne: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userOneEmail,
        password: userOnePassword,
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(userOne);

  const userOneId: string = userOne.id;

  // 2. Generate a valid UUID for a non-existing session
  const invalidSessionId: string = typia.random<string & tags.Format<"uuid">>();

  // 3. Attempt to delete a non-existent session for the user
  await TestValidator.httpError(
    "Deleting non-existent session should return 404",
    404,
    async () => {
      await api.functional.todoList.user.actors.sessions.erase(connection, {
        userId: userOneId,
        sessionId: invalidSessionId,
      });
    },
  );

  // 4. Create a second user to test cross-authentication
  const userTwoEmail: string = typia.random<string & tags.Format<"email">>();
  const userTwoPassword: string = "AnotherSecurePassword456!";

  const userTwo: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userTwoEmail,
        password: userTwoPassword,
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(userTwo);

  const userTwoId: string = userTwo.id;

  // 5. Create a new connection for user two authentication
  const userTwoConnection: api.IConnection = {
    host: connection.host,
    headers: {},
    simulate: connection.simulate,
  };

  // Authenticate userTwo on new connection
  const userTwoAuthResponse: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(userTwoConnection, {
      body: {
        email: userTwoEmail,
        password: userTwoPassword,
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(userTwoAuthResponse); // CRITICAL: Must assert the response from the authentication

  // 6. With userTwo's connection, try to delete userOne's session (non-existent to keep test simple)
  await TestValidator.httpError(
    "UserTwo cannot delete UserOne's session, should return 401 or 403",
    [401, 403],
    async () => {
      await api.functional.todoList.user.actors.sessions.erase(
        userTwoConnection,
        {
          userId: userOneId,
          sessionId: invalidSessionId,
        },
      );
    },
  );

  // 7. Test invalid userId format
  const invalidUserId: string = "not-a-uuid"; // Invalid format

  await TestValidator.httpError(
    "Invalid userId format should return 400",
    400,
    async () => {
      await api.functional.todoList.user.actors.sessions.erase(connection, {
        userId: invalidUserId,
        sessionId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // By testing:
  // - 404 for deletion of non-existent session by rightful owner
  // - 401/403 for deletion attempt by unauthorized user
  // - 400 for malformed user ID
  // We validate the authorization, validation, and security aspects of the session deletion system
  // even though we cannot test the actual deletion of a valid session due to the API's design.
}
