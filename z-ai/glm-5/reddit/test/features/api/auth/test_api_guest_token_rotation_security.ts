import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test refresh token rotation security for guest authentication.
 *
 * Validates that refresh token rotation properly invalidates old tokens
 * to prevent replay attacks. When a refresh token is used, it should
 * be invalidated and a completely new token pair issued.
 */
export async function test_api_guest_token_rotation_security(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create initial guest account and obtain tokens
  const guestConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_guest_join(guestConnection, {});
  typia.assert(initialAuth);
  // Step 2: Store initial token values and guest identity
  const initialRefreshToken = initialAuth.token.refresh;
  const initialAccessToken = initialAuth.token.access;
  const guestId = initialAuth.id;
  // Step 3: Perform token refresh
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_guest_refresh(refreshConnection, {
    body: {
      refresh_token: initialRefreshToken,
    } satisfies ICommunityPlatformGuest.IRefresh,
  });
  typia.assert(refreshedAuth);
  // Step 4: Verify token rotation - new tokens should be different
  TestValidator.notEquals(
    "new refresh token should differ from old",
    refreshedAuth.token.refresh,
    initialRefreshToken,
  );
  TestValidator.notEquals(
    "new access token should differ from old",
    refreshedAuth.token.access,
    initialAccessToken,
  );
  // Step 5: Verify guest identity is preserved
  TestValidator.equals(
    "guest ID should remain the same after refresh",
    refreshedAuth.id,
    guestId,
  );
  // Step 6: Verify old refresh token is invalidated
  // Attempting to use the old refresh token should result in an error
  await TestValidator.error(
    "old refresh token should be invalidated after rotation",
    async () => {
      const reuseConnection: api.IConnection = { host: connection.host };
      await authorize_guest_refresh(reuseConnection, {
        body: {
          refresh_token: initialRefreshToken,
        } satisfies ICommunityPlatformGuest.IRefresh,
      });
    },
  );
}
