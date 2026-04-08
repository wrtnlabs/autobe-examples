import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test token rotation behavior during guest session refresh.
 *
 * Validates the refresh token rotation security model for guest user sessions. The test creates a guest account, performs a token refresh operation, and then attempts to reuse the original refresh token to determine if the system implements refresh token rotation (one-time use) or allows multiple uses of the same refresh token.
 *
 * Refresh token rotation is a security best practice where each use of a refresh token invalidates it and issues a new refresh token. This prevents replay attacks if a refresh token is compromised. The test verifies that the system either rejects reused tokens (rotation enabled) or accepts them (rotation disabled), documenting the security behavior.
 *
 * 1. Create guest account using authorize_guest_join utility to obtain initial access and refresh tokens.
 * 2. Store the initial refresh token for later reuse testing.
 * 3. Call refresh endpoint using authorize_guest_refresh with the initial refresh token to get new token pair.
 * 4. Verify new tokens are different from original tokens (new access token, new refresh token, updated expiration timestamps).
 * 5. Attempt to reuse the OLD refresh token by calling refresh endpoint again with the original refresh token.
 * 6. Validate system behavior: either the old token is rejected with 401 error (rotation enabled) OR accepted with new tokens (rotation disabled).
 */
export async function test_api_guest_session_refresh_token_rotation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest account and obtain initial tokens
  const guestConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_guest_join(guestConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformGuest.IJoin,
  });
  typia.assert(initialAuth);
  // 2. Store the initial refresh token for reuse testing
  const initialRefreshToken = initialAuth.token.refresh;
  const initialAccessToken = initialAuth.token.access;
  // 3. Refresh tokens using the initial refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_guest_refresh(refreshConnection, {
    body: {
      refresh_token: initialRefreshToken,
    } satisfies IHrmPlatformGuest.IRefresh,
  });
  typia.assert(refreshedAuth);
  // 4. Verify new tokens are different from original tokens
  TestValidator.notEquals(
    "access token should be different after refresh",
    initialAccessToken,
    refreshedAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh token should be different after refresh",
    initialRefreshToken,
    refreshedAuth.token.refresh,
  );
  TestValidator.notEquals(
    "expiration timestamp should be updated after refresh",
    initialAuth.token.expired_at,
    refreshedAuth.token.expired_at,
  );
  // 5. Attempt to reuse the OLD refresh token
  const reuseConnection: api.IConnection = { host: connection.host };
  // 6. Validate system behavior - test expects one of two outcomes:
  // Option A: Rotation enabled - old token rejected with 401
  // Option B: Rotation disabled - old token accepted with new tokens
  // Test for rotation enabled (old token should be rejected)
  await TestValidator.error(
    "old refresh token should be rejected after use (rotation enabled)",
    async () => {
      await authorize_guest_refresh(reuseConnection, {
        body: {
          refresh_token: initialRefreshToken,
        } satisfies IHrmPlatformGuest.IRefresh,
      });
    },
  );
}
