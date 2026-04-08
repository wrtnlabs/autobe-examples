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
 * Test guest session refresh with an expired or invalid refresh token.
 *
 * Validates the error handling path when a guest attempts to refresh their session with an invalid or expired refresh token. The test ensures that the system properly rejects such tokens with a 401 Unauthorized error, requiring the guest to re-authenticate via the join endpoint.
 *
 * This scenario tests the security boundary of guest session management, ensuring that expired or tampered tokens cannot be used to extend sessions. The test creates a valid guest session first, then attempts to refresh with an invalid token to verify proper error handling.
 *
 * 1. Create a valid guest session using authorize_guest_join to obtain a refresh token.
 * 2. Extract the refresh token from the authorization response.
 * 3. Create an invalid refresh token by modifying the valid token (simulating tampering or expiration).
 * 4. Attempt to refresh the guest session with the invalid token using authorize_guest_refresh.
 * 5. Verify that the operation throws an HttpError with status 401 Unauthorized.
 * 6. Confirm that the error response contains appropriate error information.
 */
export async function test_api_guest_refresh_with_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a valid guest session to obtain a refresh token
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallGuest.IJoin,
  });
  typia.assert(authorized);
  // 2. Extract the valid refresh token
  const validRefreshToken = authorized.token.refresh;
  // 3. Create an invalid refresh token by modifying it (simulating tampering or expiration)
  const invalidRefreshToken = validRefreshToken + "_invalid";
  // 4. Attempt to refresh with the invalid token
  const refreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "refresh with invalid token returns 401 Unauthorized",
    401,
    async () =>
      await authorize_guest_refresh(refreshConnection, {
        body: {
          refresh_token: invalidRefreshToken,
        } satisfies IShoppingMallGuest.IRefresh,
      }),
  );
  // 5. Verify that a new join is required after failed refresh
  const newGuestConnection: api.IConnection = { host: connection.host };
  const newAuthorized = await authorize_guest_join(newGuestConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallGuest.IJoin,
  });
  typia.assert(newAuthorized);
  // 6. Validate that the new session has a different refresh token
  TestValidator.notEquals(
    "new session has different refresh token",
    validRefreshToken,
    newAuthorized.token.refresh,
  );
}
