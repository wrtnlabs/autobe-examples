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
 * Test guest session refresh with expired refresh token.
 * 1. Register a guest via join endpoint to obtain initial tokens
 * 2. Attempt to refresh with an invalid/expired refresh token
 * 3. Verify that the system returns 401 Unauthorized error
 * 4. Confirm that guest must re-authenticate via join to obtain new tokens
 */
export async function test_api_guest_refresh_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest connection and register
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {
    body: undefined,
  });
  typia.assert(authorized);
  // 2. Extract the valid refresh token
  const validRefreshToken = authorized.token.refresh;
  // 3. Create a new connection for the refresh attempt
  const refreshConnection: api.IConnection = { host: connection.host };
  // 4. Attempt to refresh with an invalid token (simulate expired token)
  // We use a modified token to simulate expiration/invalidity
  const expiredRefreshToken = validRefreshToken + "_expired";
  // 5. Verify that refresh with invalid/expired token returns 401
  await TestValidator.httpError(
    "expired refresh token returns 401",
    401,
    async () => {
      await authorize_guest_refresh(refreshConnection, {
        body: {
          refresh_token: expiredRefreshToken,
        } satisfies IDiscussionBoardGuest.IRefresh,
      });
    },
  );
  // 6. Verify that guest can re-authenticate via join to obtain new tokens
  const rejoinConnection: api.IConnection = { host: connection.host };
  const reauthorized = await authorize_guest_join(rejoinConnection, {
    body: {
      device_fingerprint: typia.random<string>(),
    },
  });
  typia.assert(reauthorized);
  // 7. Validate that new tokens are obtained and differ from the expired one
  TestValidator.notEquals(
    "new refresh token differs from expired one",
    reauthorized.token.refresh,
    expiredRefreshToken,
  );
  TestValidator.notEquals(
    "new refresh token differs from original valid one",
    reauthorized.token.refresh,
    validRefreshToken,
  );
}
