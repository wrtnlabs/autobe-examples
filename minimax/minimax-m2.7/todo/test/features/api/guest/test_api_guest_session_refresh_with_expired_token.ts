import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test that token refresh fails when using an expired/invalid refresh token.
 *
 * This simulates a user returning after their refresh token has expired or
 * been invalidated. The test verifies that the refresh endpoint properly
 * rejects invalid tokens and does not issue new access tokens.
 *
 * Steps:
 * 1. Register a guest account to obtain valid tokens
 * 2. Attempt to refresh with an invalid/expired refresh token
 * 3. Verify response returns 401 Unauthorized error
 * 4. Verify no new tokens are issued
 */
export async function test_api_guest_session_refresh_with_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a guest account to get valid tokens
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      device_id: typia.random<string & tags.Format<"uuid">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // Store the valid refresh token for reference
  const validRefreshToken = authorized.refresh;
  // 2. Attempt to refresh with an invalid/expired refresh token
  // Using a fake/invalid token simulates an expired or revoked session
  const expiredToken = "invalid.expired.refresh.token.jwt";
  // 3. Verify response returns 401 Unauthorized error
  await TestValidator.httpError(
    "refresh with expired/invalid token should fail with 401",
    401,
    async () =>
      await api.functional.multiUserTodo.auth.guest.refresh(connection, {
        body: {
          refresh_token: expiredToken,
        } satisfies IMultiUserTodoGuest.IRefresh,
      }),
  );
  // 4. Verify the connection still has the original valid token (no new tokens issued)
  TestValidator.equals(
    "original access token should remain unchanged",
    guestConnection.headers?.Authorization,
    authorized.token.access,
  );
  // Additional validation: using the same expired token again should still fail
  await TestValidator.httpError(
    "expired token should remain invalid on retry",
    401,
    async () =>
      await api.functional.multiUserTodo.auth.guest.refresh(connection, {
        body: {
          refresh_token: expiredToken,
        } satisfies IMultiUserTodoGuest.IRefresh,
      }),
  );
}
