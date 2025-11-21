import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";

/**
 * Test that each guest session creation generates a unique session token that
 * cannot be duplicated or reused. Validate cryptographic security requirements
 * and ensure tokens are sufficiently random to prevent session hijacking or
 * token prediction attacks.
 */
export async function test_api_guest_session_creation_session_token_uniqueness(
  connection: api.IConnection,
) {
  // Create multiple guest sessions to test token uniqueness
  const sessions: ICommunityPlatformGuest.IAuthorized[] =
    await ArrayUtil.asyncRepeat(10, async () => {
      const session = await api.functional.auth.guest.join(connection, {
        body: {} satisfies ICommunityPlatformGuest.ICreate,
      });
      typia.assert(session);
      return session;
    });

  // Extract all session tokens
  const sessionTokens = sessions.map((session) => session.session_token);

  // Validate that all session tokens are unique
  const uniqueTokens = new Set(sessionTokens);
  TestValidator.equals(
    "all session tokens should be unique",
    uniqueTokens.size,
    sessions.length,
  );

  // Validate basic token format requirements
  sessions.forEach((session, index) => {
    TestValidator.predicate(
      `session ${index + 1} token should be non-empty string`,
      session.session_token.length > 0,
    );

    TestValidator.predicate(
      `session ${index + 1} token should have sufficient length for security`,
      session.session_token.length >= 16,
    );
  });
}
