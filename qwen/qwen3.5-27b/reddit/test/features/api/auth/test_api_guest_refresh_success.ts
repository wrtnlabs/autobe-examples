import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
import type { IRedditCloneGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test successful guest token refresh operation with token rotation validation.
 *
 * Validates the complete guest session renewal workflow where a valid refresh token is used to obtain new authentication tokens. Ensures that token rotation is properly implemented, guest account data remains consistent, and expiration timestamps are correctly calculated.
 *
 * The test verifies that both access and refresh tokens are rotated (new tokens are different from originals), the guest account identifier remains stable across refresh operations, and all timestamp fields are properly maintained and in the future.
 *
 * 1. Register a new guest account using device fingerprint and obtain initial tokens.
 * 2. Extract the refresh token from the join response.
 * 3. Call the refresh endpoint with the refresh token to obtain new tokens.
 * 4. Validate that new tokens are different from originals (token rotation).
 * 5. Verify guest account data consistency (id, device_fingerprint, timestamps).
 * 6. Ensure expiration timestamps are in the future.
 */
export async function test_api_guest_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest connection and register guest account
  const guestConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneGuest.IJoin,
  });
  typia.assert(joinResult);
  // Store original tokens for comparison
  const originalAccessToken = joinResult.token.access;
  const originalRefreshToken = joinResult.token.refresh;
  const originalGuestId = joinResult.id;
  const originalDeviceFingerprint = joinResult.device_fingerprint;
  const originalCreatedAt = joinResult.created_at;
  // 2. Create new connection for refresh operation
  const refreshConnection: api.IConnection = { host: connection.host };
  // 3. Refresh the guest session using the refresh token
  const refreshResult = await authorize_guest_refresh(refreshConnection, {
    body: {
      refresh_token: originalRefreshToken,
    } satisfies IRedditCloneGuest.IRefresh,
  });
  typia.assert(refreshResult);
  // 4. Validate token rotation - new tokens should be different
  TestValidator.notEquals(
    "access token rotated",
    originalAccessToken,
    refreshResult.token.access,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    originalRefreshToken,
    refreshResult.token.refresh,
  );
  // 5. Validate guest account data consistency
  TestValidator.equals(
    "guest id remains consistent",
    originalGuestId,
    refreshResult.id,
  );
  TestValidator.equals(
    "device fingerprint remains consistent",
    originalDeviceFingerprint,
    refreshResult.device_fingerprint,
  );
  TestValidator.equals(
    "created_at timestamp remains unchanged",
    originalCreatedAt,
    refreshResult.created_at,
  );
  // 6. Validate expiration timestamps are in the future
  const now = new Date();
  const expiredAt = new Date(refreshResult.token.expired_at);
  const refreshableUntil = new Date(refreshResult.token.refreshable_until);
  TestValidator.predicate(
    "access token expired_at is in the future",
    expiredAt > now,
  );
  TestValidator.predicate(
    "refresh token refreshable_until is in the future",
    refreshableUntil > now,
  );
  // 7. Validate sessions array is populated
  TestValidator.predicate(
    "sessions array is not empty",
    refreshResult.sessions.length > 0,
  );
  // 8. Validate guest account is active (not deleted)
  TestValidator.equals(
    "guest account is active (deleted_at is null)",
    refreshResult.deleted_at,
    null,
  );
}
