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
 * Verify that refreshing with an expired or invalid guest session token is rejected with HTTP 401.
 *
 * Tests the session expiry business rule for guest authentication. When a guest session's refresh token has expired or is invalid, the refresh endpoint must deny the request with a 401 Unauthorized status, requiring the guest to re-establish their identity through the join endpoint.
 *
 * The test validates that the server properly enforces session boundaries and does not extend sessions with invalid credentials, maintaining the security integrity of the guest authentication flow. Even though real session expiration cannot be waited for in an E2E test, an invalid token triggers the same 401 rejection path and proves the server correctly denies unauthorized refresh attempts.
 *
 * 1. Create a guest identity and session by calling the join endpoint, obtaining valid JWT tokens verified with typia.assert.
 * 2. Attempt to refresh using an invalid refresh token that does not correspond to any active session.
 * 3. Verify the server rejects the refresh attempt with HTTP 401 status.
 */
export async function test_api_guest_session_refresh_expired(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest session via join
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {});
  typia.assert(authorized);
  // 2. Attempt refresh with expired/invalid token → expect 401
  const refreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "expired refresh token rejected with 401",
    401,
    async () => {
      await authorize_guest_refresh(refreshConnection, {
        body: {
          refreshToken: RandomGenerator.alphaNumeric(128),
        } satisfies ITodoAppGuest.IRefresh,
      });
    },
  );
}
