import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";

export async function test_api_guest_registration_multiple_sessions(
  connection: api.IConnection,
) {
  // Create 3 independent guest sessions to validate session isolation
  const guestSessions: ICommunityPlatformGuest.IAuthorized[] =
    await ArrayUtil.asyncRepeat(3, async () => {
      // Simulate independent sessions by making separate API calls
      const guest: ICommunityPlatformGuest.IAuthorized =
        await api.functional.auth.guest.join(connection);
      typia.assert<ICommunityPlatformGuest.IAuthorized>(guest);
      return guest;
    });

  // Validate that we have exactly 3 sessions
  TestValidator.equals("3 guest sessions created", guestSessions.length, 3);

  // Validate that each session has a unique ID
  for (let i = 0; i < guestSessions.length; i++) {
    for (let j = i + 1; j < guestSessions.length; j++) {
      TestValidator.notEquals(
        `session ${i} and session ${j} must have different IDs`,
        guestSessions[i].id,
        guestSessions[j].id,
      );
    }
  }

  // Validate that each session has a unique access token
  for (let i = 0; i < guestSessions.length; i++) {
    for (let j = i + 1; j < guestSessions.length; j++) {
      TestValidator.notEquals(
        `session ${i} and session ${j} must have different access tokens`,
        guestSessions[i].token.access,
        guestSessions[j].token.access,
      );
    }
  }

  // Validate token structure: access, refresh, expired_at, refreshable_until
  for (const session of guestSessions) {
    // Access token must be defined and non-empty
    TestValidator.predicate(
      "access token is non-empty",
      () => session.token.access.length > 0,
    );

    // Refresh token must be defined and non-empty
    TestValidator.predicate(
      "refresh token is non-empty",
      () => session.token.refresh.length > 0,
    );

    // Verify expired_at is in ISO 8601 date-time format
    typia.assert<string & tags.Format<"date-time">>(session.token.expired_at);

    // Verify refreshable_until is in ISO 8601 date-time format
    typia.assert<string & tags.Format<"date-time">>(
      session.token.refreshable_until,
    );

    // Validate expiration is within 15 minutes (900,000 ms) of creation
    const now = new Date().getTime();
    const expiresAt = new Date(session.token.expired_at).getTime();
    const diff = expiresAt - now;
    TestValidator.predicate(
      "token expires within 15 minutes (900,000 ms)",
      () => diff > 0 && diff < 900000,
    );
  }

  // Validate that session data does not leak between connections
  // All sessions should be independently issued with no shared state
  // This is confirmed by all IDs and tokens being unique across sessions
}
