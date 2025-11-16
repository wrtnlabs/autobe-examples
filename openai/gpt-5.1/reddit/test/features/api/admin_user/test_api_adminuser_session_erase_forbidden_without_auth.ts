import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";

/**
 * Verify that unauthenticated callers cannot erase admin user sessions.
 *
 * Business purpose
 *
 * - Ensure that the administrative session management endpoint DELETE
 *   /communityPlatform/adminUser/adminUsers/{username}/sessions/{sessionId} is
 *   protected by authentication and cannot be abused by anonymous clients to
 *   disrupt admin access.
 *
 * High-level flow
 *
 * 1. Join an adminUser using /auth/adminUser/join to get a realistic admin
 *    identity and establish an authenticated connection.
 * 2. Clone the connection into a new unauthenticated connection object whose
 *    headers are empty, so that subsequent calls carry no Authorization
 *    header.
 * 3. Build realistic-looking path parameters for the erase endpoint using the
 *    joined admin's username and a random sessionId string.
 * 4. Call the erase endpoint with the unauthenticated connection and assert that
 *    it throws, using TestValidator.error.
 *
 * Notes and constraints
 *
 * - We do not assert the exact HTTP status code (401 vs 403) because the test
 *   framework forbids status-code-specific assertions.
 * - We cannot directly verify persistence of a session row because there is no
 *   session listing API in the provided SDK; we only confirm that
 *   unauthenticated clients cannot successfully call the erase endpoint.
 */
export async function test_api_adminuser_session_erase_forbidden_without_auth(
  connection: api.IConnection,
) {
  // 1. Join an adminUser to obtain an authorized context and realistic username
  const joinBody = typia.random<ICommunityPlatformAdminUserJoin.IRequest>();

  const authorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Create an unauthenticated connection by stripping headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 3. Prepare realistic path parameters
  const username: string = authorized.username;
  const sessionId: string = typia.random<string>();

  // 4. Attempt to erase the session without authentication and expect failure
  await TestValidator.error(
    "unauthenticated erase must be forbidden",
    async () => {
      await api.functional.communityPlatform.adminUser.adminUsers.sessions.erase(
        unauthConn,
        {
          username,
          sessionId,
        },
      );
    },
  );
}
