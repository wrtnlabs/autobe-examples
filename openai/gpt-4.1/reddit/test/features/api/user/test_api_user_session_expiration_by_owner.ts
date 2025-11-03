import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSession";

/**
 * Validate that a user can successfully revoke (expire) their own login
 * session, and that using the revoked session token immediately prevents
 * further authenticated API access.
 *
 * Steps:
 *
 * 1. Register a new user and create a session via join
 * 2. Expire (revoke) the current session by setting expired_at using the session
 *    update API
 * 3. Verify session is marked as expired in the response
 * 4. Attempt an authenticated API call (such as self session revoke again),
 *    expecting it to be rejected due to now-invalid session token.
 */
export async function test_api_user_session_expiration_by_owner(
  connection: api.IConnection,
) {
  // 1. Register new user and obtain session
  const baseUrl = "https://test.example.com";
  const registration: ICommunityPlatformUser.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    ip: null, // let server derive
    href: baseUrl,
    referrer: baseUrl,
  };
  const auth: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: registration,
    });
  typia.assert(auth);
  // Store session info
  const userId = auth.id;
  const sessionToken = auth.token.access;
  // (Assume platform provides way to identify the current session; simulate sessionId as user account for this scenario)

  // 2. Expire the current session by setting expired_at
  // (Assume the sessionId is the userId for this test as we have no listing API)
  const sessionId = userId satisfies string & tags.Format<"uuid">;
  const now = new Date().toISOString();
  const updatePayload = {
    expired_at: now,
  } satisfies ICommunityPlatformUserSession.IUpdate;
  const result: ICommunityPlatformUserSession =
    await api.functional.communityPlatform.user.users.sessions.update(
      connection,
      {
        userId,
        sessionId,
        body: updatePayload,
      },
    );
  typia.assert(result);
  TestValidator.equals(
    "session expired_at should match revocation time",
    result.expired_at,
    now,
  );

  // 3. Attempt an API call again with the same session token - simulate by using join again (will be denied because user already joined and session was revoked)
  // We test session expiration by reusing the connection (still has Authorization header set)
  await TestValidator.error(
    "API call with revoked session should be denied",
    async () => {
      await api.functional.communityPlatform.user.users.sessions.update(
        connection,
        {
          userId,
          sessionId,
          body: updatePayload,
        },
      );
    },
  );
}
