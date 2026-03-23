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

export async function test_api_guest_refresh_expired_token(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test guest refresh token expiration handling.
   * 1. Create a valid guest session to obtain tokens
   * 2. Attempt to refresh with an invalid/expired refresh token
   * 3. Verify 401 Unauthorized error is returned
   * 4. Confirm the error indicates token expiration/invalidity
   */
  // 1. Create guest connection and establish valid session
  const guestConnection: api.IConnection = { host: connection.host };
  const validSession = await authorize_guest_join(guestConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(validSession);
  // Verify we got valid tokens
  TestValidator.predicate(
    "has access token",
    validSession.token.access.length > 0,
  );
  TestValidator.predicate(
    "has refresh token",
    validSession.token.refresh.length > 0,
  );
  // 2. Create a new connection for the refresh attempt
  const refreshConnection: api.IConnection = { host: connection.host };
  // 3. Attempt to refresh with an invalid/expired refresh token
  // Use a deliberately invalid token to simulate expiration
  const invalidRefreshBody = {
    refresh_token: "invalid_expired_token_12345",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallGuest.IRefresh;
  // 4. Verify that refreshing with invalid token throws 401 error
  await TestValidator.httpError(
    "refresh with expired token returns 401",
    401,
    async () => {
      await authorize_guest_refresh(refreshConnection, {
        body: invalidRefreshBody,
      });
    },
  );
  // 5. Verify that the original valid session still works (token hasn't been invalidated)
  const validRefreshBody = {
    refresh_token: validSession.token.refresh,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallGuest.IRefresh;
  const refreshedSession = await authorize_guest_refresh(guestConnection, {
    body: validRefreshBody,
  });
  typia.assert(refreshedSession);
  // 6. Verify the valid refresh succeeded and got new tokens
  TestValidator.predicate(
    "refreshed session has new access token",
    refreshedSession.token.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed session has new refresh token",
    refreshedSession.token.refresh.length > 0,
  );
  TestValidator.notEquals(
    "access token rotated",
    validSession.token.access,
    refreshedSession.token.access,
  );
}
