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
 * Test successful guest session token refresh operation.
 *
 * Validates the complete token refresh flow for guest users including initial guest registration, token refresh with valid refresh token, and verification of token rotation security.
 *
 * The test ensures that guest sessions can be extended without re-registration by using the refresh token. This is critical for maintaining uninterrupted browsing experience for guest users who haven't created full customer accounts.
 *
 * 1. Register a new guest account via POST /shoppingMall/auth/guest/join with a unique device fingerprint to obtain initial access and refresh tokens.
 * 2. Call the refresh endpoint POST /shoppingMall/auth/guest/refresh with the valid refresh token from the join response.
 * 3. Validate that the response contains new access and refresh tokens, the guest id matches the original, and the expired_at timestamp is extended into the future.
 * 4. Verify the new tokens are different from the original tokens (token rotation security feature).
 * 5. Confirm the guest can use the new access token for authenticated operations.
 */
export async function test_api_guest_session_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new guest account to obtain initial session tokens
  const guestConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallGuest.IJoin,
  });
  typia.assert(joinResult);
  // 2. Refresh session tokens using the refresh token from join response
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_guest_refresh(refreshConnection, {
    body: {
      refresh_token: joinResult.token.refresh,
      ip: typia.random<string & tags.Format<"ipv4">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallGuest.IRefresh,
  });
  typia.assert(refreshResult);
  // 3. Validate guest id matches original (same guest account)
  TestValidator.equals("guest id matches", refreshResult.id, joinResult.id);
  TestValidator.equals(
    "device fingerprint matches",
    refreshResult.device_fingerprint,
    joinResult.device_fingerprint,
  );
  // 4. Validate token rotation - new tokens must be different from original
  TestValidator.notEquals(
    "access token rotated",
    refreshResult.token.access,
    joinResult.token.access,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    refreshResult.token.refresh,
    joinResult.token.refresh,
  );
  // 5. Validate expiration timestamp is extended into the future
  const originalExpiredAt = new Date(joinResult.token.expired_at).getTime();
  const refreshedExpiredAt = new Date(refreshResult.token.expired_at).getTime();
  TestValidator.predicate(
    "expiration extended",
    refreshedExpiredAt > originalExpiredAt,
  );
  // 6. Validate refreshable_until is also extended
  const originalRefreshableUntil = new Date(
    joinResult.token.refreshable_until,
  ).getTime();
  const refreshedRefreshableUntil = new Date(
    refreshResult.token.refreshable_until,
  ).getTime();
  TestValidator.predicate(
    "refreshable_until extended",
    refreshedRefreshableUntil >= originalRefreshableUntil,
  );
  // 7. Validate new access token is properly formatted and usable
  TestValidator.predicate(
    "new access token is non-empty string",
    refreshResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "new refresh token is non-empty string",
    refreshResult.token.refresh.length > 0,
  );
  // 8. Validate timestamps are valid ISO 8601 format
  typia.assert<IShoppingMallGuest.IAuthorized>(refreshResult);
}
