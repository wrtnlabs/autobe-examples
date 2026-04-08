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
 * Test guest session refresh success path with token renewal validation.
 *
 * Validates the complete guest session refresh workflow including initial guest registration, token acquisition, session refresh with valid refresh token, and verification of new token issuance. Ensures that the guest ID remains consistent across refresh operations and that new tokens have appropriate expiration times.
 *
 * The refresh operation allows guests to maintain continuous access to public content without re-authenticating with their device fingerprint. This test verifies that the refresh endpoint correctly validates the refresh token and issues new credentials.
 *
 * 1. Create initial guest session with unique device fingerprint.
 * 2. Capture guest ID and refresh token from join response.
 * 3. Call refresh endpoint with valid refresh token.
 * 4. Validate new tokens are issued with correct guest ID.
 * 5. Verify new expiration time is set in the future.
 */
export async function test_api_guest_session_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create initial guest session
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
  // 2. Capture guest ID and refresh token
  const guestId = joinResult.id;
  const refreshToken = joinResult.token.refresh;
  // 3. Refresh the session with valid refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_guest_refresh(refreshConnection, {
    body: {
      refresh_token: refreshToken,
    } satisfies IRedditCommunityGuest.IRefresh,
  });
  typia.assert(refreshResult);
  // 4. Validate guest ID remains consistent
  TestValidator.equals(
    "guest ID matches after refresh",
    refreshResult.id,
    guestId,
  );
  // 5. Validate device fingerprint is preserved
  TestValidator.equals(
    "device fingerprint matches",
    refreshResult.device_fingerprint,
    joinResult.device_fingerprint,
  );
  // 6. Verify new tokens are issued
  TestValidator.notEquals(
    "new access token issued",
    refreshResult.token.access,
    joinResult.token.access,
  );
  TestValidator.notEquals(
    "new refresh token issued",
    refreshResult.token.refresh,
    refreshToken,
  );
  // 7. Verify new expiration time is set in the future
  const newExpiredAt = new Date(refreshResult.token.expired_at);
  const now = new Date();
  TestValidator.predicate(
    "new expiration is in the future",
    newExpiredAt > now,
  );
  // 8. Validate refreshable_until is also set correctly
  const refreshableUntil = new Date(refreshResult.token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until is in the future",
    refreshableUntil > now,
  );
}
