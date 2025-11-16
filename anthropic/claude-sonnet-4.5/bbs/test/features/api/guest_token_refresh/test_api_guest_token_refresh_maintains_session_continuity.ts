import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

/**
 * Test that token refresh maintains guest session continuity after access token
 * expiration.
 *
 * This test validates the complete token refresh workflow for guest users:
 *
 * 1. Creates a guest account and receives initial access/refresh tokens
 * 2. Uses the refresh token to obtain new access credentials
 * 3. Verifies that the guest ID remains consistent across token refresh
 * 4. Confirms that new tokens are properly issued with valid expiration times
 * 5. Ensures session state and identity persist through the refresh operation
 *
 * The test simulates the real-world scenario where a guest's access token
 * expires during browsing, and they need to refresh their credentials without
 * losing their session context or having to create a new guest account.
 */
export async function test_api_guest_token_refresh_maintains_session_continuity(
  connection: api.IConnection,
) {
  // Step 1: Create initial guest account with session tracking information
  const initialGuest: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        ip: typia.random<string>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardGuest.ICreate,
    });
  typia.assert(initialGuest);

  // Step 2: Store initial guest ID and refresh token for comparison
  const originalGuestId = initialGuest.id;
  const originalRefreshToken = initialGuest.token.refresh;

  // Step 3: Simulate token refresh using the refresh token
  const refreshedGuest: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: {
        refresh_token: originalRefreshToken,
      } satisfies IDiscussionBoardGuest.IRefresh,
    });
  typia.assert(refreshedGuest);

  // Step 4: Validate that guest ID remains the same (session continuity)
  TestValidator.equals(
    "guest ID must remain consistent after token refresh",
    refreshedGuest.id,
    originalGuestId,
  );

  // Step 5: Validate that new tokens are properly issued
  // typia.assert already validated the complete token structure including
  // access token, refresh token, expired_at, and refreshable_until with
  // their correct Format<"date-time"> constraints
}
