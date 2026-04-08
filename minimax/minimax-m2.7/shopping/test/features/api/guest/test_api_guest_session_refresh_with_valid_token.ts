import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test successful guest session token refresh with a valid refresh token.
 *
 * Validates the complete token refresh flow for guest sessions:
 * - Creates a guest session via join endpoint to obtain initial access and refresh tokens
 * - Calls the refresh endpoint with the valid refresh token
 * - Verifies new tokens are issued (token rotation where both access and refresh tokens differ)
 * - Validates all required token metadata fields are present in response
 *
 * Token rotation is a security measure where each refresh invalidates the old refresh token
 * and issues a new one, preventing replay attacks if a refresh token is compromised.
 */
export async function test_api_guest_session_refresh_with_valid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest session to obtain initial tokens
  const guestConnection: api.IConnection = { host: connection.host };
  const initialSession = await authorize_guest_join(guestConnection, {});
  typia.assert(initialSession);
  // Store original tokens for comparison
  const originalAccessToken = initialSession.token.access;
  const originalRefreshToken = initialSession.token.refresh;
  // 2. Refresh the session using the refresh token
  const refreshedConnection: api.IConnection = { host: connection.host };
  const refreshedSession = await authorize_guest_refresh(refreshedConnection, {
    body: {
      refreshToken: originalRefreshToken,
    } satisfies IEcommerceMallGuest.IRefresh,
  });
  typia.assert(refreshedSession);
  // 3. Validate token rotation - new tokens must be different from originals
  TestValidator.notEquals(
    "access token should be rotated",
    refreshedSession.token.access,
    originalAccessToken,
  );
  TestValidator.notEquals(
    "refresh token should be rotated",
    refreshedSession.token.refresh,
    originalRefreshToken,
  );
  // 4. Validate all required token fields are present
  TestValidator.predicate(
    "has valid access token",
    refreshedSession.token.access.length > 0,
  );
  TestValidator.predicate(
    "has valid refresh token",
    refreshedSession.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "has expired_at timestamp",
    !!refreshedSession.token.expired_at,
  );
  TestValidator.predicate(
    "has refreshable_until timestamp",
    !!refreshedSession.token.refreshable_until,
  );
}
