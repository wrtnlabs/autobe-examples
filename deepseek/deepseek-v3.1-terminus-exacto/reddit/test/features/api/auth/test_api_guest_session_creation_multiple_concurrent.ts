import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";

/**
 * Test concurrent guest session creation to ensure system handles multiple
 * anonymous users simultaneously without conflicts. Validate that each session
 * receives unique tokens and identifiers, and that session management maintains
 * proper isolation between concurrent guest users browsing the platform.
 */
export async function test_api_guest_session_creation_multiple_concurrent(
  connection: api.IConnection,
) {
  // Create 5 guest sessions concurrently to test concurrent access
  const concurrentCount = 5;
  const guestSessions = await Promise.all(
    ArrayUtil.repeat(concurrentCount, async (index) => {
      const guestSession = await api.functional.auth.guest.join(connection, {
        body: {
          session_token: undefined,
        } satisfies ICommunityPlatformGuest.ICreate,
      });
      typia.assert(guestSession);
      return guestSession;
    }),
  );

  // Validate that all sessions were created successfully
  TestValidator.equals(
    "all concurrent guest sessions should be created",
    guestSessions.length,
    concurrentCount,
  );

  // Verify each session has unique UUID identifiers
  const sessionIds = guestSessions.map((session) => session.id);
  const uniqueIds = new Set(sessionIds);
  TestValidator.equals(
    "each guest session should have unique UUID",
    uniqueIds.size,
    concurrentCount,
  );

  // Verify each session has unique session tokens
  const sessionTokens = guestSessions.map((session) => session.session_token);
  const uniqueTokens = new Set(sessionTokens);
  TestValidator.equals(
    "each guest session should have unique session token",
    uniqueTokens.size,
    concurrentCount,
  );

  // Verify each session has unique authentication tokens
  const accessTokens = guestSessions.map((session) => session.token.access);
  const uniqueAccessTokens = new Set(accessTokens);
  TestValidator.equals(
    "each guest session should have unique access token",
    uniqueAccessTokens.size,
    concurrentCount,
  );

  const refreshTokens = guestSessions.map((session) => session.token.refresh);
  const uniqueRefreshTokens = new Set(refreshTokens);
  TestValidator.equals(
    "each guest session should have unique refresh token",
    uniqueRefreshTokens.size,
    concurrentCount,
  );

  // Validate token expiration timestamps are properly set
  guestSessions.forEach((session, index) => {
    TestValidator.predicate(
      `session ${index} should have valid expiration timestamp`,
      new Date(session.token.expired_at) > new Date(),
    );
    TestValidator.predicate(
      `session ${index} should have valid refreshable until timestamp`,
      new Date(session.token.refreshable_until) > new Date(),
    );
  });

  // Validate session creation timestamps
  guestSessions.forEach((session, index) => {
    TestValidator.predicate(
      `session ${index} should have valid creation timestamp`,
      new Date(session.created_at) <= new Date(),
    );
    TestValidator.predicate(
      `session ${index} should have valid update timestamp`,
      new Date(session.updated_at) <= new Date(),
    );

    // Check that creation and update timestamps are very close (within 5 seconds)
    const createdTime = new Date(session.created_at).getTime();
    const updatedTime = new Date(session.updated_at).getTime();
    const timeDifference = Math.abs(createdTime - updatedTime);
    TestValidator.predicate(
      `session ${index} should have creation and update timestamps within 5 seconds`,
      timeDifference <= 5000,
    );
  });

  // Verify that deleted_at is undefined for new sessions
  guestSessions.forEach((session, index) => {
    TestValidator.equals(
      `session ${index} should not have deleted_at timestamp`,
      session.deleted_at,
      undefined,
    );
  });

  // Additional validation: ensure tokens are non-empty strings
  guestSessions.forEach((session, index) => {
    TestValidator.predicate(
      `session ${index} session token should be non-empty`,
      session.session_token.length > 0,
    );
    TestValidator.predicate(
      `session ${index} access token should be non-empty`,
      session.token.access.length > 0,
    );
    TestValidator.predicate(
      `session ${index} refresh token should be non-empty`,
      session.token.refresh.length > 0,
    );
  });
}
