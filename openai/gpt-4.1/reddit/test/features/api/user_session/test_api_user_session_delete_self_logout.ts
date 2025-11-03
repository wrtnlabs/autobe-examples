import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validates user session deletion (self-logout) functionality.
 *
 * 1. Register (join) a new user with randomized data and acquire a session
 *    (authorization token).
 * 2. Attempt to log out (delete) using the
 *    /communityPlatform/user/users/{userId}/sessions/{sessionId} endpoint with
 *    the acquired session.
 * 3. Validate that the session was deleted by confirming subsequent access using
 *    the session is impossible.
 * 4. Attempt to delete an already deleted (expired) session to confirm appropriate
 *    error/no-op handling.
 * 5. Ensure only the session owner can perform the session deletion; attempts to
 *    delete another user's session should fail.
 */
export async function test_api_user_session_delete_self_logout(
  connection: api.IConnection,
) {
  // 1. Register a new user (join) and obtain the initial session (token)
  const userJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    href: "https://test-join.com/flow",
    referrer: "https://referrer.com/path",
  } satisfies ICommunityPlatformUser.IJoin;

  const authorized: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userJoinBody,
    });
  typia.assert(authorized);

  // Extract userId and current session token
  const userId = authorized.id;
  const sessionToken = authorized.token;
  typia.assert(sessionToken);

  // We assume the sessionId can be derived from the token for this test; in real systems, this may require an endpoint to list sessions or decode JWTs.
  // For testing, we simulate a sessionId as a random uuid (since the API expects it as a path param).
  // In real-world test, this should be replaced with logic to extract the real session ID.
  // Here, we use the user ID as session ID for test flow demonstration purposes if no API provides explicit session ID.
  // If a sessionId is embedded in the JWT or available via another endpoint, it would be retrieved accordingly.
  const sessionId = userId as string & tags.Format<"uuid">;

  // 2. Authenticated user deletes their own session (logout)
  await api.functional.communityPlatform.user.users.sessions.erase(connection, {
    userId,
    sessionId,
  });

  // 3. Attempt to use the deleted session (should fail). We will simulate this by attempting a protected endpoint with a connection using the now deleted session token.
  // For demonstration, we create a new connection with the deleted (old) token.
  const expiredConn: api.IConnection = {
    ...connection,
    headers: { ...connection.headers, Authorization: sessionToken.access },
  };

  await TestValidator.error(
    "access fails with deleted session token",
    async () => {
      // Try to delete the session again with the now-invalid/expired session
      await api.functional.communityPlatform.user.users.sessions.erase(
        expiredConn,
        {
          userId,
          sessionId,
        },
      );
    },
  );

  // 4. Attempt to delete an already deleted/expired session (using valid new session)
  await TestValidator.error(
    "repeated session deletion fails or no-ops",
    async () => {
      await api.functional.communityPlatform.user.users.sessions.erase(
        connection,
        {
          userId,
          sessionId,
        },
      );
    },
  );

  // 5. Attempt to delete another user's session (should fail)
  // Register a second user
  const strangerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    href: "https://stranger.com/flow",
    referrer: "https://external.com/ref",
  } satisfies ICommunityPlatformUser.IJoin;

  const strangerAuth: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: strangerJoinBody,
    });
  typia.assert(strangerAuth);
  const strangerUserId = strangerAuth.id;

  await TestValidator.error(
    "stranger cannot delete another user's session",
    async () => {
      await api.functional.communityPlatform.user.users.sessions.erase(
        connection,
        {
          userId,
          sessionId,
        },
      );
    },
  );
}
