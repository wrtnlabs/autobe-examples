import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test successful guest session refresh with a valid refresh token.
 *
 * Validates the complete guest session refresh workflow including initial session creation, token extraction, and successful refresh operation. Ensures that the refresh endpoint correctly validates the refresh token and issues new access and refresh tokens with proper rotation.
 *
 * Special attention is given to verifying token rotation (both access and refresh tokens are replaced with new values) and that the expiration timestamps are properly updated to extend the session validity.
 *
 * 1. Create initial guest session with randomized session context data (href, referrer, ip).
 * 2. Extract the refresh token from the initial authorization response.
 * 3. Call the refresh endpoint with the refresh token to extend the session.
 * 4. Validate the refresh response contains valid IShoppingMallGuest.IAuthorized structure.
 * 5. Verify the new access token is different from the original (token rotation).
 * 6. Verify the new refresh token is different from the original (token rotation).
 * 7. Verify the expired_at and refreshable_until timestamps are present and valid.
 */
export async function test_api_guest_refresh_session_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create initial guest session
  const guestConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_guest_join(guestConnection, {});
  typia.assert(initialAuth);
  // 2. Extract the refresh token from the initial response
  const refreshToken = initialAuth.token.refresh;
  // 3. Call the refresh endpoint with the refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshBody = {
    refresh_token: refreshToken,
  } satisfies IShoppingMallGuest.IRefresh;
  const refreshedAuth = await authorize_guest_refresh(refreshConnection, {
    body: refreshBody,
  });
  typia.assert(refreshedAuth);
  // 4. Verify the new access token is different from the original (token rotation)
  TestValidator.notEquals(
    "access token rotated",
    initialAuth.token.access,
    refreshedAuth.token.access,
  );
  // 5. Verify the new refresh token is different from the original (token rotation)
  TestValidator.notEquals(
    "refresh token rotated",
    initialAuth.token.refresh,
    refreshedAuth.token.refresh,
  );
  // 6. Verify the expired_at timestamp is present and valid
  TestValidator.predicate("expired_at is valid date-time", () => {
    const date = new Date(refreshedAuth.token.expired_at);
    return !isNaN(date.getTime());
  });
  // 7. Verify the refreshable_until timestamp is present and valid
  TestValidator.predicate("refreshable_until is valid date-time", () => {
    const date = new Date(refreshedAuth.token.refreshable_until);
    return !isNaN(date.getTime());
  });
  // 8. Verify the guest ID remains the same after refresh
  TestValidator.equals(
    "guest id unchanged after refresh",
    initialAuth.id,
    refreshedAuth.id,
  );
  // 9. Verify the device fingerprint remains the same after refresh
  TestValidator.equals(
    "device fingerprint unchanged after refresh",
    initialAuth.device_fingerprint,
    refreshedAuth.device_fingerprint,
  );
}
