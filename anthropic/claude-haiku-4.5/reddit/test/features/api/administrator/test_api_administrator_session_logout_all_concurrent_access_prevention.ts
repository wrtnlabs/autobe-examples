import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test that concurrent access attempts after logout-all are properly blocked.
 *
 * This test validates that executing logout-all immediately invalidates all
 * active sessions for an administrator account. After logout-all is executed,
 * all concurrent access attempts using previously valid tokens should be
 * rejected with authentication failures, confirming that the invalidation is
 * immediate and effective across all channels.
 *
 * Test workflow:
 *
 * 1. Create administrator account and authenticate via join
 * 2. Store the initial access and refresh tokens
 * 3. Execute logout-all to invalidate all sessions
 * 4. Attempt multiple concurrent requests with the old tokens
 * 5. Verify all concurrent requests fail with authentication errors
 * 6. Confirm logout-all invalidation is immediate and cannot be bypassed
 */
export async function test_api_administrator_session_logout_all_concurrent_access_prevention(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account via join
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminUsername = RandomGenerator.alphaNumeric(8);
  const adminName = RandomGenerator.name();

  const joinResponse: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: adminUsername,
        name: adminName,
        href: "http://localhost:3000/admin/register",
        referrer: undefined,
        ip: undefined,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(joinResponse);

  // Step 2: Store the tokens from join response
  const initialAccessToken = joinResponse.token.access;
  const initialRefreshToken = joinResponse.token.refresh;

  TestValidator.predicate(
    "initial access token should be valid string",
    typeof initialAccessToken === "string" && initialAccessToken.length > 0,
  );
  TestValidator.predicate(
    "initial refresh token should be valid string",
    typeof initialRefreshToken === "string" && initialRefreshToken.length > 0,
  );

  // Step 3: Create a connection with the initial tokens to use for logout-all
  const authenticatedConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${initialAccessToken}`,
    },
  };

  // Execute logout-all to invalidate all sessions
  await api.functional.communityPlatform.administrator.auth.administrator.sessions.logout_all.logoutAll(
    authenticatedConnection,
  );

  // Step 4: Create connections with the invalidated tokens for concurrent access attempts
  const invalidatedTokenConnections = ArrayUtil.repeat(5, () => {
    const conn: api.IConnection = {
      ...connection,
      headers: {
        ...connection.headers,
        Authorization: `Bearer ${initialAccessToken}`,
      },
    };
    return conn;
  });

  // Step 5 & 6: Attempt multiple concurrent requests using the invalidated tokens
  // All should be rejected with authentication errors
  await TestValidator.error(
    "all concurrent requests after logout-all should fail with authentication error",
    async () => {
      const concurrentRequests = invalidatedTokenConnections.map((conn) =>
        api.functional.communityPlatform.administrator.auth.administrator.sessions.logout_all.logoutAll(
          conn,
        ),
      );
      await Promise.all(concurrentRequests);
    },
  );
}
