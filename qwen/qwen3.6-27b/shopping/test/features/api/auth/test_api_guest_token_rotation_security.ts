import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Validates the security-critical token rotation mechanism during guest session refresh.
 *
 * This test ensures that refreshing a guest session invalidates the previously used refresh token, generates a new pair of authentication tokens, and updates the session expiration correctly. It prevents token replay attacks by verifying that the original refresh token cannot be reused after a successful refresh operation. The new session must establish a fresh 24-hour expiration deadline.
 *
 * 1. Registers a guest account using a device fingerprint to obtain initial access and refresh tokens.
 * 2. Performs a token refresh using the initial refresh token to obtain a new token pair.
 * 3. Verifies that both the access and refresh tokens have been rotated and differ from the originals.
 * 4. Confirms that the new session's expiration timestamps are updated to approximately 24 hours from the refresh time.
 * 5. Attempts to reuse the original refresh token and validates that the API rejects it with a 401 Unauthorized error.
 */
export async function test_api_guest_token_rotation_security(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  // 1. Register guest account to obtain initial tokens
  const joinResponse = await authorize_guest_join(guestConnection, {});
  typia.assert(joinResponse);
  const initialRefreshToken = joinResponse.token.refresh;
  const initialAccessToken = joinResponse.token.access;
  // 2. Perform token refresh to rotate tokens
  const refreshResponse = await authorize_guest_refresh(guestConnection, {
    body: {
      refreshToken: initialRefreshToken,
    } satisfies IEcommercePlatformGuest.IRefresh,
  });
  typia.assert(refreshResponse);
  // 3. Validate token rotation: new tokens must differ from old ones
  TestValidator.notEquals(
    "access token rotated",
    refreshResponse.token.access,
    initialAccessToken,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    refreshResponse.token.refresh,
    initialRefreshToken,
  );
  // 4. Validate new session expiration is updated to ~24 hours from refresh time
  const now = new Date();
  const twentyFourHoursLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  TestValidator.predicate(
    "session expiration updated to ~24h",
    refreshResponse.token.expired_at > now.toISOString() &&
      refreshResponse.token.expired_at <= twentyFourHoursLater.toISOString(),
  );
  // 5. Validate token reuse prevention: attempt to use original refresh token
  const reuseConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "original refresh token rejected after rotation",
    401,
    async () => {
      await api.functional.ecommercePlatform.auth.guest.refresh(
        reuseConnection,
        {
          body: {
            refreshToken: initialRefreshToken,
          } satisfies IEcommercePlatformGuest.IRefresh,
        },
      );
    },
  );
}
