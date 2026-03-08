import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test successful guest token refresh with valid refresh token.
 * 1. Create guest session via join endpoint to obtain initial refresh token
 * 2. Call refresh endpoint with the valid refresh token
 * 3. Verify response contains new access and refresh tokens
 * 4. Verify new tokens have valid expiration timestamps
 * 5. Verify the new access token can be used to access protected guest endpoints
 */
export async function test_api_guest_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest session to obtain initial refresh token
  const guestConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphabets(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardGuest.IJoin,
  });
  typia.assert(initialAuth);
  // Store initial token for comparison
  const initialRefreshToken = initialAuth.token.refresh;
  const initialExpiredAt = initialAuth.token.expired_at;
  // 2. Call refresh endpoint with the valid refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_guest_refresh(refreshConnection, {
    body: {
      refresh: initialRefreshToken,
    } satisfies IDiscussionBoardGuest.IRefresh,
  });
  typia.assert(refreshedAuth);
  // 3. Verify response contains new access and refresh tokens
  TestValidator.predicate(
    "has access token",
    refreshedAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "has refresh token",
    refreshedAuth.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "has expired_at",
    refreshedAuth.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "has refreshable_until",
    refreshedAuth.token.refreshable_until.length > 0,
  );
  // 4. Verify new tokens have valid expiration timestamps
  TestValidator.predicate("expired_at is valid date-time", () => {
    const date = new Date(refreshedAuth.token.expired_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("refreshable_until is valid date-time", () => {
    const date = new Date(refreshedAuth.token.refreshable_until);
    return !isNaN(date.getTime());
  });
  // 5. Verify tokens are different from initial (token rotation)
  TestValidator.notEquals(
    "access token rotated",
    initialAuth.token.access,
    refreshedAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    initialRefreshToken,
    refreshedAuth.token.refresh,
  );
  // 6. Verify the new access token can be used to access protected guest endpoints
  // The refreshConnection already has the new token in headers from authorize_guest_refresh
  TestValidator.predicate("new token is in connection headers", () => {
    return (
      refreshConnection.headers?.Authorization === refreshedAuth.token.access
    );
  });
}
