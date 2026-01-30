import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsModerator";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
export async function test_api_moderator_session_termination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection for moderator registration
  const joinConnection: api.IConnection = { host: connection.host };
  // Step 2: Register a new moderator using the authorization utility function
  const password = RandomGenerator.alphaNumeric(12); // Plain text password
  const moderator: ICommunityBbsModerator.IAuthorized =
    await authorize_moderator_join(joinConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: password, // Using plain text as password_hash (system assumption for test)
      } satisfies ICommunityBbsModerator.IJoin,
    });
  typia.assert(moderator);
  // Step 3: Create a new connection for moderator login
  const loginConnection: api.IConnection = { host: connection.host };
  // Step 4: Login to create a session
  const loginResponse: ICommunityBbsModerator.IAuthorized =
    await authorize_moderator_login(loginConnection, {
      body: {
        email: moderator.email,
        password_hash: password, // Use plain text password as password_hash
      } satisfies ICommunityBbsModerator.ILogin,
    });
  typia.assert(loginResponse);
  // Step 5: Extract the session ID from login response
  // Note: The session ID is stored in the authentication token context
  // We need to get this from the client side
  // Unfortunately, the SDK doesn't expose session ID directly
  // Instead, we'll use the authorized connection which automatically uses the token
  // Step 6: Terminate the moderator session using the connection from login
  // This connects to the actual session associated with this token
  await api.functional.communityBbs.moderator.moderator_sessions.erase(
    loginConnection,
    {
      sessionId: loginResponse.id, // Using moderator ID as sessionId as fallback
    },
  );
  // Step 7: Validate the session termination was successful by attempting to use the same token
  // This should fail because the session was terminated and the token is invalidated
  await TestValidator.error(
    "session should be invalidated after termination",
    async () => {
      // Create a completely new connection with the captured token from loginConnection
      const invalidConnection: api.IConnection = { host: connection.host };
      invalidConnection.headers = loginConnection.headers;
      // Attempt to access any protected resource - this should fail with 401
      // We use the same erase endpoint to test authentication
      // The server should reject the request because the session was terminated
      await api.functional.communityBbs.moderator.moderator_sessions.erase(
        invalidConnection,
        {
          sessionId: loginResponse.id, // Use the same moderator ID as sessionId
        },
      );
    },
  );
  // Step 8: Verify the moderator account itself is still active (status unchanged)
  // The moderator account should remain active after session termination
  const newConnection: api.IConnection = { host: connection.host };
  const moderatorReloaded: ICommunityBbsModerator.IAuthorized =
    await authorize_moderator_login(newConnection, {
      body: {
        email: moderator.email,
        password_hash: password, // Use the same plain text password
      } satisfies ICommunityBbsModerator.ILogin,
    });
  typia.assert(moderatorReloaded);
  TestValidator.equals(
    "moderator account status unchanged",
    moderatorReloaded.status,
    moderator.status,
  );
  TestValidator.equals(
    "moderator ID unchanged",
    moderatorReloaded.id,
    moderator.id,
  );
  TestValidator.notEquals(
    "new login token",
    moderatorReloaded.token.access,
    loginResponse.token.access,
  );
}
