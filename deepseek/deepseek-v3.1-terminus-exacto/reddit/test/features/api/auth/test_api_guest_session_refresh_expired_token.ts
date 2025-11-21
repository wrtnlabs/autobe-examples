import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";

/**
 * Test guest session refresh with an expired or invalid session token.
 *
 * This test validates that the system properly rejects refresh requests for
 * expired sessions and returns appropriate error responses. It ensures security
 * controls prevent unauthorized session extension attempts by testing with
 * invalid session tokens that should not be refreshable.
 *
 * Test Workflow:
 *
 * 1. Create an initial guest session using the join endpoint
 * 2. Attempt to refresh the session with an invalid/expired token
 * 3. Validate that the refresh operation fails with an appropriate error
 * 4. Ensure security controls prevent unauthorized session extension
 */
export async function test_api_guest_session_refresh_expired_token(
  connection: api.IConnection,
) {
  // Step 1: Create an initial guest session to obtain a valid token
  const guestSession = await api.functional.auth.guest.join(connection, {
    body: {
      session_token: undefined,
    } satisfies ICommunityPlatformGuest.ICreate,
  });
  typia.assert(guestSession);

  // Step 2: Attempt to refresh the session with clearly invalid tokens
  // Use patterns that are clearly invalid and unlikely to match any valid session
  const invalidTokens = [
    "invalid-session-token-12345", // Clearly invalid format
    "expired_token_" + RandomGenerator.alphaNumeric(20), // Prefix indicating expiration
    "", // Empty token
    "not-a-valid-format", // Malformed token
  ] as const;

  for (const invalidToken of invalidTokens) {
    await TestValidator.error(
      `refresh should fail with invalid token: ${invalidToken}`,
      async () => {
        await api.functional.auth.guest.refresh(connection, {
          body: {
            session_token: invalidToken,
          } satisfies ICommunityPlatformGuest.IRefresh,
        });
      },
    );
  }

  // Step 3: Additional validation - test with token from different session
  // Create a second guest session and try to use its token with the first session
  const secondGuestSession = await api.functional.auth.guest.join(connection, {
    body: {
      session_token: undefined,
    } satisfies ICommunityPlatformGuest.ICreate,
  });
  typia.assert(secondGuestSession);

  await TestValidator.error(
    "refresh should fail with token from different session",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          session_token: secondGuestSession.session_token,
        } satisfies ICommunityPlatformGuest.IRefresh,
      });
    },
  );
}
