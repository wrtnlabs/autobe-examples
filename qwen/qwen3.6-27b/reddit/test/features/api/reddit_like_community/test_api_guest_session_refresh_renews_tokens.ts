import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test that a guest authentication session can be refreshed with a valid token.
 *
 * Validates that when a guest refreshes their session using a valid refresh token, the system issues new JWT tokens with extended expiration timestamps while preserving the original guest identity. Confirms that the guest ID remains stable across refresh operations and that both access and refresh tokens are rotated with fresh values.
 *
 * Verifies the complete token refresh flow from initial guest creation through session renewal, ensuring timestamps are properly extended and tokens are properly rotated.
 *
 * 1. Guest joins to obtain initial access token, refresh token, guest ID, and expiration timestamps.
 * 2. Guest refreshes session using the captured refresh token.
 * 3. Validates guest ID remains unchanged (no new guest identity created).
 * 4. Validates new access and refresh tokens differ from originals.
 * 5. Validates expiration timestamps are extended (later than original values).
 */
export async function test_api_guest_session_refresh_renews_tokens(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest joins to obtain initial tokens and guest identity
  const guestConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_guest_join(guestConnection, {});
  typia.assert(joinResponse);
  const originalGuestId = joinResponse.id;
  const originalAccessToken = joinResponse.token.access;
  const originalRefreshToken = joinResponse.token.refresh;
  const originalExpiredAt = joinResponse.token.expired_at;
  const originalRefreshableUntil = joinResponse.token.refreshable_until;
  // 2. Create refresh connection and refresh the session
  const refreshConnection: api.IConnection = { host: connection.host };
  const body = {
    refresh: originalRefreshToken,
  } satisfies IRedditLikeCommunityGuest.IRefresh;
  const refreshResponse = await authorize_guest_refresh(refreshConnection, {
    body,
  });
  typia.assert(refreshResponse);
  // 3. Validate guest ID remains the same (guest identity unchanged)
  TestValidator.equals(
    "guest ID unchanged after refresh",
    refreshResponse.id,
    originalGuestId,
  );
  // 4. Validate tokens are renewed (different from originals)
  TestValidator.notEquals(
    "new access token differs from original",
    refreshResponse.token.access,
    originalAccessToken,
  );
  TestValidator.notEquals(
    "new refresh token differs from original",
    refreshResponse.token.refresh,
    originalRefreshToken,
  );
  // 5. Validate expiration timestamps are extended
  TestValidator.predicate(
    "expired_at is later than original",
    new Date(refreshResponse.token.expired_at).getTime() >
      new Date(originalExpiredAt).getTime(),
  );
  TestValidator.predicate(
    "refreshable_until is later than original",
    new Date(refreshResponse.token.refreshable_until).getTime() >
      new Date(originalRefreshableUntil).getTime(),
  );
}
