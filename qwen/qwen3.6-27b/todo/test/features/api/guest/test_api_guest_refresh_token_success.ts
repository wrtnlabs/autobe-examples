import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test successful guest access token refresh workflow.
 *
 * Validates the complete guest token renewal flow where an unauthenticated visitor extends their session without re-authentication. A guest first joins via device fingerprint registration to obtain initial tokens, then uses the refresh token to obtain new access credentials.
 *
 * Key business rules verified: guest identity remains stable across refresh operations (same UUID), new JWT token pairs are issued for both access and refresh tokens, and session expiration timestamps are updated to reflect the extended validity window.
 *
 * 1. Guest joins the application with device fingerprint, receiving initial access and refresh tokens along with a guest UUID.
 * 2. Guest calls refresh endpoint using the refresh token to extend the session.
 * 3. Response includes new token pair with updated expiration timestamps.
 * 4. Validate guest UUID remains unchanged across the refresh operation.
 * 5. Validate new access and refresh tokens differ from the original tokens.
 */
export async function test_api_guest_refresh_token_success(
  connection: api.IConnection,
) {
  // 1. Guest joins to obtain initial tokens
  const guestConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_guest_join(guestConnection, {});
  typia.assert(initialAuth);
  const initialGuestId = initialAuth.id;
  const initialAccessToken = initialAuth.token.access;
  const initialRefreshToken = initialAuth.token.refresh;
  const initialExpiredAt = initialAuth.token.expired_at;
  const initialRefreshableUntil = initialAuth.token.refreshable_until;
  // 2. Guest refreshes their access token
  const refreshedAuth = await authorize_guest_refresh(guestConnection, {
    body: {
      refresh: initialAuth.token.refresh,
    } satisfies ITodoAppGuest.IRefresh,
  });
  typia.assert(refreshedAuth);
  // 3. Validate guest identity stability
  TestValidator.equals(
    "guest id remains unchanged after refresh",
    refreshedAuth.id,
    initialGuestId,
  );
  // 4. Validate new access token is different
  TestValidator.notEquals(
    "new access token differs from initial",
    refreshedAuth.token.access,
    initialAccessToken,
  );
  // 5. Validate new refresh token is different
  TestValidator.notEquals(
    "new refresh token differs from initial",
    refreshedAuth.token.refresh,
    initialRefreshToken,
  );
  // 6. Validate updated expiration timestamps
  TestValidator.predicate(
    "expired_at is later than initial",
    new Date(refreshedAuth.token.expired_at) > new Date(initialExpiredAt),
  );
  TestValidator.predicate(
    "refreshable_until is later than initial",
    new Date(refreshedAuth.token.refreshable_until) >
      new Date(initialRefreshableUntil),
  );
}
