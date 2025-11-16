import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test that token refresh maintains guest session identity and context.
 *
 * Creates a guest account and stores the initial guest ID. Uses the refresh
 * endpoint to obtain new tokens, then verifies that the refreshed tokens
 * represent the same guest session (same guest ID). Confirms that session data
 * and identity are preserved through the refresh operation, allowing the guest
 * to continue accessing the platform seamlessly without losing session
 * continuity.
 *
 * Test steps:
 *
 * 1. Create initial guest account via /auth/guest/join
 * 2. Store the initial guest ID and refresh token
 * 3. Call /auth/guest/refresh with the refresh token to get new tokens
 * 4. Verify the refreshed response has the same guest ID as the original
 * 5. Confirm new tokens are different but maintain session identity
 * 6. Validate session continuity is maintained
 */
export async function test_api_guest_token_refresh_maintains_session_identity(
  connection: api.IConnection,
) {
  // Step 1: Create initial guest account
  const initialGuest: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.guest.join(connection);
  typia.assert(initialGuest);

  const initialGuestId = initialGuest.id;
  const initialRefreshToken = initialGuest.token.refresh;
  const initialAccessToken = initialGuest.token.access;

  // Step 2: Refresh the guest session using the refresh token
  const refreshedGuest: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: {
        refresh_token: initialRefreshToken,
      } satisfies ICommunityPlatformMember.IRefresh,
    });
  typia.assert(refreshedGuest);

  const refreshedGuestId = refreshedGuest.id;
  const refreshedAccessToken = refreshedGuest.token.access;

  // Step 3: Verify session identity is maintained (same guest ID)
  TestValidator.equals(
    "guest session identity preserved after refresh",
    refreshedGuestId,
    initialGuestId,
  );

  // Step 4: Verify that access tokens have been refreshed (new tokens issued)
  TestValidator.notEquals(
    "refreshed access token is different from initial",
    refreshedAccessToken,
    initialAccessToken,
  );

  // Step 5: Verify guest can continue session with new tokens
  TestValidator.predicate(
    "session continuity maintained with valid new tokens",
    refreshedGuestId === initialGuestId &&
      refreshedAccessToken.length > 0 &&
      refreshedGuest.token.refresh.length > 0,
  );
}
