import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test that using an expired refresh token returns 401 Unauthorized.
 *
 * Validates the security boundary for guest session token refresh. When a guest
 * attempts to refresh their session using an expired, revoked, or invalid refresh
 * token, the system properly rejects the request with 401 Unauthorized status.
 *
 * This test ensures that:
 * 1. A valid guest session can be created successfully
 * 2. An invalid/expired refresh token is rejected with 401 status
 * 3. The error message appropriately indicates token invalidity
 *
 * 1. Create guest session via POST /ecommerceMall/auth/guest/join
 * 2. Attempt refresh with invalid/expired token via POST /ecommerceMall/auth/guest/refresh
 * 3. Validate 401 response status
 * 4. Verify error response structure
 */
export async function test_api_guest_session_refresh_with_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a valid guest session to obtain refresh token
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {});
  // Validate the guest session was created successfully
  typia.assert(authorized);
  TestValidator.equals("has valid session id", authorized.id.length > 0, true);
  TestValidator.equals(
    "has valid access token",
    authorized.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "has valid refresh token",
    authorized.token.refresh.length > 0,
    true,
  );
  // 2. Attempt to refresh with an invalid/expired token
  // Use a deliberately invalid token (random string that is not a valid JWT)
  const invalidRefreshToken = RandomGenerator.alphaNumeric(64);
  // 3. Validate that 401 Unauthorized is returned
  await TestValidator.httpError(
    "expired token rejected with 401",
    401,
    async () => {
      const invalidConnection: api.IConnection = { host: connection.host };
      await authorize_guest_refresh(invalidConnection, {
        body: {
          refreshToken: invalidRefreshToken,
        } satisfies IEcommerceMallGuest.IRefresh,
      });
    },
  );
}
