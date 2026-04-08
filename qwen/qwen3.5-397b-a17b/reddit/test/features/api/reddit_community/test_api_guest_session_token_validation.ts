import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest session refresh token validation against session store.
 *
 * Validates the complete guest session refresh workflow including initial session creation, token validation, and session renewal. Ensures that the refresh endpoint correctly validates the refresh token against the reddit_community_guest_sessions table, confirms the session exists and has not expired, and generates new tokens with updated expiration times.
 *
 * Special attention is given to verifying that the same guest identity is maintained across the refresh operation and that new token credentials are properly issued with fresh expiration timestamps. The device fingerprint must remain consistent, proving the refresh operation correctly identifies the original guest account.
 *
 * 1. Create guest session via join endpoint with device fingerprint and tracking data.
 * 2. Extract refresh token and guest identity from join response.
 * 3. Call refresh endpoint with valid refresh token.
 * 4. Verify response contains same guest ID and device fingerprint.
 * 5. Validate that new tokens have been issued with updated expiration times.
 */
export async function test_api_guest_session_token_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest session via join endpoint
  const guestConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_guest_join(guestConnection, {
    body: {
      deviceFingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityGuest.IJoin,
  });
  typia.assert(joinResult);
  // 2. Extract refresh token and guest identity
  const guestId = joinResult.id;
  const deviceFingerprint = joinResult.device_fingerprint;
  const refreshToken = joinResult.token.refresh;
  const originalAccessExpiredAt = joinResult.token.expired_at;
  const originalRefreshableUntil = joinResult.token.refreshable_until;
  // 3. Call refresh endpoint with valid refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_guest_refresh(refreshConnection, {
    body: {
      refresh_token: refreshToken,
    } satisfies IRedditCommunityGuest.IRefresh,
  });
  typia.assert(refreshResult);
  // 4. Verify same guest identity is maintained
  TestValidator.equals(
    "guest ID matches after refresh",
    refreshResult.id,
    guestId,
  );
  TestValidator.equals(
    "device fingerprint unchanged",
    refreshResult.device_fingerprint,
    deviceFingerprint,
  );
  // 5. Validate new tokens have been issued with updated expiration
  TestValidator.notEquals(
    "access token refreshed",
    refreshResult.token.access,
    joinResult.token.access,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    refreshResult.token.refresh,
    refreshToken,
  );
  TestValidator.predicate(
    "new access token expiration is later",
    refreshResult.token.expired_at > originalAccessExpiredAt,
  );
  TestValidator.predicate(
    "new refreshable until is same or later",
    refreshResult.token.refreshable_until >= originalRefreshableUntil,
  );
}
