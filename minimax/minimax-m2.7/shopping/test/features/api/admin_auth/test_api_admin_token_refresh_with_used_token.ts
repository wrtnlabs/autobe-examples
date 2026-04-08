import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that attempting to refresh with an already-used refresh token fails (token rotation invalidation).
 *
 * Validates the token rotation security mechanism where each refresh token can only be used once.
 * When a refresh token is used successfully, it is invalidated and a new token pair is issued.
 * Subsequent attempts to use the old refresh token should be rejected to prevent token reuse attacks.
 *
 * The test flow:
 * 1. Register a new administrator account via join - captures the initial refresh token
 * 2. Call the refresh endpoint with the token to get new tokens - this invalidates the old refresh token
 * 3. Attempt to call refresh endpoint again with the now-invalidated old refresh token
 * 4. Verify the second refresh attempt is rejected with an authentication error
 *
 * This test ensures that even if a refresh token is somehow intercepted, it cannot be used more than once,
 * significantly reducing the window of opportunity for token theft attacks.
 */
export async function test_api_admin_token_refresh_with_used_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized: IEcommerceMallAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {});
  // Capture the refresh token from the join response
  const oldRefreshToken: string = authorized.token.refresh;
  // 2. Call refresh endpoint with the token to get new tokens
  // This should succeed and invalidate the old refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const newTokens: IEcommerceMallAdmin.IAuthorized =
    await authorize_admin_refresh(refreshConnection, {
      body: {
        refresh: oldRefreshToken,
      } satisfies IEcommerceMallAdmin.IRefresh,
    });
  typia.assert(newTokens);
  // 3. Attempt to call refresh endpoint again with the now-invalidated old refresh token
  // This should fail because token rotation has invalidated the old refresh token
  await TestValidator.httpError(
    "should reject already-used refresh token",
    [401, 403],
    async () => {
      const failedConnection: api.IConnection = { host: connection.host };
      await api.functional.ecommerceMall.auth.admin.refresh(failedConnection, {
        body: {
          refresh: oldRefreshToken,
        } satisfies IEcommerceMallAdmin.IRefresh,
      });
    },
  );
}
