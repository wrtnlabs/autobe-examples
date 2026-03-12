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

export async function test_api_guest_refresh_token_rotation(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test the refresh token rotation security feature for guest sessions.
   * Validates that refresh tokens are single-use and rotated on each successful refresh,
   * preventing replay attacks by rejecting attempts to reuse consumed tokens.
   */
  // Step 1: Create initial guest session to obtain first refresh token
  const guestConnection1: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_guest_join(guestConnection1, {
    body: {
      href: "https://example.com/products",
      referrer: "https://google.com/search",
      ip: "192.168.1.100",
    } satisfies IShoppingMallGuest.IJoin,
  });
  typia.assert(initialAuth);
  const firstRefreshToken = initialAuth.token.refresh;
  // Step 2: Refresh the session using the first refresh token
  const guestConnection2: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_guest_refresh(guestConnection2, {
    body: {
      refresh_token: firstRefreshToken,
      href: "https://example.com/cart",
      referrer: "https://example.com/products",
      ip: "192.168.1.100",
    } satisfies IShoppingMallGuest.IRefresh,
  });
  typia.assert(refreshedAuth);
  const secondRefreshToken = refreshedAuth.token.refresh;
  // Verify that the refresh token was rotated (new token is different from old)
  TestValidator.notEquals(
    "refresh token rotated",
    firstRefreshToken,
    secondRefreshToken,
  );
  // Step 3: Attempt to reuse the first (consumed) refresh token
  // This should fail with 401 Unauthorized because the token was rotated
  const guestConnection3: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "reused refresh token rejected with 401",
    401,
    async () => {
      await authorize_guest_refresh(guestConnection3, {
        body: {
          refresh_token: firstRefreshToken,
          href: "https://example.com/checkout",
          referrer: "https://example.com/cart",
          ip: "192.168.1.100",
        } satisfies IShoppingMallGuest.IRefresh,
      });
    },
  );
  // Step 4: Verify that the new refresh token still works
  const guestConnection4: api.IConnection = { host: connection.host };
  const reRefreshedAuth = await authorize_guest_refresh(guestConnection4, {
    body: {
      refresh_token: secondRefreshToken,
      href: "https://example.com/checkout",
      referrer: "https://example.com/cart",
      ip: "192.168.1.100",
    } satisfies IShoppingMallGuest.IRefresh,
  });
  typia.assert(reRefreshedAuth);
  // Verify the token was rotated again
  TestValidator.notEquals(
    "refresh token rotated again",
    secondRefreshToken,
    reRefreshedAuth.token.refresh,
  );
}
