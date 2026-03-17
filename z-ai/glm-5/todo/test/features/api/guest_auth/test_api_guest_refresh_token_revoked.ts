import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPrivateTodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest refresh token revocation after first use.
 * Validates that refresh tokens can only be used once (one-time use policy).
 * After successful refresh, the old refresh token is revoked and cannot be reused.
 */
export async function test_api_guest_refresh_token_revoked(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest session via join to obtain initial tokens
  const guestConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_guest_join(guestConnection, {});
  typia.assert(joinResult);
  // 2. Save the original refresh token
  const originalRefreshToken = joinResult.token.refresh;
  // 3. Successfully use the refresh token once
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_guest_refresh(refreshConnection, {
    body: {
      refresh_token: originalRefreshToken,
    } satisfies IPrivateTodoAppGuest.IRefresh,
  });
  typia.assert(refreshResult);
  // Validate that new tokens were issued
  TestValidator.notEquals(
    "new refresh token differs",
    originalRefreshToken,
    refreshResult.token.refresh,
  );
  // 4. Attempt to use the original (now revoked) refresh token again
  await TestValidator.httpError(
    "revoked refresh token should be rejected",
    401,
    async () => {
      const revokedTokenConnection: api.IConnection = { host: connection.host };
      await api.functional.privateTodoApp.auth.guest.refresh(
        revokedTokenConnection,
        {
          body: {
            refresh_token: originalRefreshToken,
          } satisfies IPrivateTodoAppGuest.IRefresh,
        },
      );
    },
  );
}
