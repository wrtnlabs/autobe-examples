import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_guest_token_refresh_expired_refresh_token(
  connection: api.IConnection,
) {
  // Step 1: Create a new guest account to obtain initial tokens
  const guestAccount = await api.functional.auth.guest.join(connection);
  typia.assert(guestAccount);

  // Step 2: Extract the refresh token from the guest account
  const refreshToken = guestAccount.token.refresh;
  TestValidator.predicate(
    "refresh token should be provided",
    refreshToken.length > 0,
  );

  // Step 3: Attempt to refresh tokens using an invalid/expired refresh token
  // An expired or invalid refresh token should be rejected with HTTP 401 Unauthorized
  const expiredRefreshToken =
    "expired_token_" + RandomGenerator.alphaNumeric(32);

  await TestValidator.error(
    "expired refresh token should be rejected with unauthorized error",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: expiredRefreshToken,
        } satisfies ICommunityPlatformMember.IRefresh,
      });
    },
  );

  // Step 4: Verify that the guest must re-register to continue accessing the platform
  // After failed token refresh, a new guest account is required
  const newGuestAccount = await api.functional.auth.guest.join(connection);
  typia.assert(newGuestAccount);

  // Step 5: Validate that the new guest account has valid tokens
  TestValidator.predicate(
    "new guest should have valid access token after re-registration",
    newGuestAccount.token.access.length > 0,
  );

  TestValidator.predicate(
    "new guest should have valid refresh token after re-registration",
    newGuestAccount.token.refresh.length > 0,
  );

  // Step 6: Validate token expiration timestamps for newly created guest account
  const refreshableUntil = new Date(newGuestAccount.token.refreshable_until);
  const now = new Date();
  TestValidator.predicate(
    "refreshable_until should be in the future for valid tokens",
    refreshableUntil > now,
  );

  // Step 7: Verify that valid refresh tokens can still be used to refresh the session
  const refreshedAccount = await api.functional.auth.guest.refresh(connection, {
    body: {
      refresh_token: newGuestAccount.token.refresh,
    } satisfies ICommunityPlatformMember.IRefresh,
  });
  typia.assert(refreshedAccount);

  TestValidator.predicate(
    "refreshed guest account should have new access token",
    refreshedAccount.token.access.length > 0,
  );
}
