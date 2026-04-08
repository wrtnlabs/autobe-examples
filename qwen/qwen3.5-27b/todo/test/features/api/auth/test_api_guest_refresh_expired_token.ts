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
 * Test guest token refresh with an expired or invalid refresh token.
 *
 * Validates the error handling behavior when attempting to refresh guest authentication tokens with an invalid or malformed refresh token. The test ensures that the system properly rejects invalid authentication attempts and returns appropriate error responses.
 *
 * 1. Register a new guest using device fingerprint to obtain initial access and refresh tokens.
 * 2. Extract the refresh token from the authorization response.
 * 3. Create an intentionally invalid refresh token by modifying the original token.
 * 4. Attempt to refresh tokens using the invalid refresh token.
 * 5. Verify that the system rejects the invalid token with a 401 HTTP error.
 * 6. Confirm that the error handling prevents unauthorized token refresh attempts.
 */
export async function test_api_guest_refresh_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register guest and obtain initial tokens
  const guestConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_guest_join(guestConnection, {
    body: {},
  });
  typia.assert(authResult);
  // 2. Extract the valid refresh token
  const validRefreshToken = authResult.token.refresh;
  // 3. Create an invalid refresh token by modifying it
  const invalidRefreshToken = `invalid_${validRefreshToken}`;
  // 4. Attempt to refresh with invalid token - should fail with 401
  await TestValidator.httpError(
    "rejects invalid refresh token with 401",
    401,
    async () => {
      const refreshConnection: api.IConnection = { host: connection.host };
      await authorize_guest_refresh(refreshConnection, {
        body: {
          refreshToken: invalidRefreshToken,
        } satisfies ITodoAppGuest.IRefresh,
      });
    },
  );
}
