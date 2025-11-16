import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

/**
 * Test that token refresh preserves guest user identity and session context.
 *
 * This test validates that when a guest user refreshes their access token, the
 * guest ID remains unchanged, ensuring session continuity. The test creates a
 * guest account, performs token refresh, and verifies that the guest ID in the
 * refreshed response matches the original guest ID.
 *
 * Test Flow:
 *
 * 1. Create a new guest account with valid session metadata
 * 2. Extract the original guest ID and refresh token
 * 3. Perform token refresh using the refresh token
 * 4. Verify the guest ID remains identical after refresh
 */
export async function test_api_guest_token_refresh_preserves_guest_identity(
  connection: api.IConnection,
) {
  // Step 1: Create a new guest account
  const guestRegistration = await api.functional.auth.guest.join(connection, {
    body: {
      ip: typia.random<string>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardGuest.ICreate,
  });
  typia.assert(guestRegistration);

  // Step 2: Store the original guest ID and refresh token
  const originalGuestId = guestRegistration.id;
  const refreshToken = guestRegistration.token.refresh;

  // Step 3: Perform token refresh
  const refreshedGuest = await api.functional.auth.guest.refresh(connection, {
    body: {
      refresh_token: refreshToken,
    } satisfies IDiscussionBoardGuest.IRefresh,
  });
  typia.assert(refreshedGuest);

  // Step 4: Verify guest ID preservation
  TestValidator.equals(
    "guest ID must remain identical after token refresh",
    refreshedGuest.id,
    originalGuestId,
  );
}
