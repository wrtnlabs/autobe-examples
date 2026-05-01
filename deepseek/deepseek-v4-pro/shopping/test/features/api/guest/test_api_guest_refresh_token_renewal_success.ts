import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import type { IShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test successful guest refresh token renewal with session continuity.
 *
 * Validates the complete guest token refresh flow where an existing guest exchanges a valid refresh token for a new JWT token pair without re-identifying via device fingerprint. This test ensures session continuity for guests navigating between pages while maintaining the append-only audit trail pattern.
 *
 * The test exercises token rotation — verifying that both the access and refresh tokens are replaced with new values — and session audit integrity — confirming that each refresh creates a new session record while preserving all previous sessions unchanged.
 *
 * 1. A guest joins via device fingerprint to obtain an initial JWT token pair, establishing the first session with original IP, href, and referrer context.
 * 2. The guest refreshes tokens using the refresh token with updated session context (different IP, href, and referrer).
 * 3. Validates the response contains a new access token and refresh token, both different from the originals.
 * 4. Verifies exactly one new session was added (append-only), with the updated context values.
 * 5. Confirms the original session is preserved identically in the returned session history.
 * 6. Ensures guest identity (ID and device fingerprint) remains consistent across operations.
 */
export async function test_api_guest_refresh_token_renewal_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as guest to obtain initial JWT token pair
  const guestConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    device_fingerprint: typia.random<string>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallGuest.IJoin;
  const initialAuth = await authorize_guest_join(guestConnection, {
    body: joinBody,
  });
  typia.assert(initialAuth);
  const initialAccessToken = initialAuth.token.access;
  const initialRefreshToken = initialAuth.token.refresh;
  const initialSessionCount = initialAuth.sessions.length;
  const originalSession = initialAuth.sessions[initialSessionCount - 1];
  // 2. Refresh with updated session context
  const newContextBody = {
    refresh_token: initialRefreshToken,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallGuest.IRefresh;
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_guest_refresh(refreshConnection, {
    body: newContextBody,
  });
  typia.assert(refreshedAuth);
  // 3. Validate token rotation
  TestValidator.notEquals(
    "access token rotated",
    refreshedAuth.token.access,
    initialAccessToken,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    refreshedAuth.token.refresh,
    initialRefreshToken,
  );
  // 4. Validate append-only session pattern
  TestValidator.equals(
    "session count increased by one",
    refreshedAuth.sessions.length,
    initialSessionCount + 1,
  );
  // 5. Validate new session has updated context values
  const newSession = refreshedAuth.sessions[refreshedAuth.sessions.length - 1];
  TestValidator.notEquals(
    "new session has different ID from original",
    newSession.id,
    originalSession.id,
  );
  TestValidator.equals(
    "new session IP matches refresh request",
    newSession.ip,
    newContextBody.ip,
  );
  TestValidator.equals(
    "new session href matches refresh request",
    newSession.href,
    newContextBody.href,
  );
  TestValidator.equals(
    "new session referrer matches refresh request",
    newSession.referrer,
    newContextBody.referrer,
  );
  // 6. Validate original session preserved unchanged in history
  const preservedSession = refreshedAuth.sessions[0];
  TestValidator.equals(
    "original session ID preserved",
    preservedSession.id,
    originalSession.id,
  );
  TestValidator.equals(
    "original session IP unchanged",
    preservedSession.ip,
    originalSession.ip,
  );
  TestValidator.equals(
    "original session href unchanged",
    preservedSession.href,
    originalSession.href,
  );
  TestValidator.equals(
    "original session referrer unchanged",
    preservedSession.referrer,
    originalSession.referrer,
  );
  // 7. Validate guest identity consistency
  TestValidator.equals(
    "guest ID consistent across refreshes",
    refreshedAuth.id,
    initialAuth.id,
  );
  TestValidator.equals(
    "device fingerprint consistent",
    refreshedAuth.device_fingerprint,
    initialAuth.device_fingerprint,
  );
}
