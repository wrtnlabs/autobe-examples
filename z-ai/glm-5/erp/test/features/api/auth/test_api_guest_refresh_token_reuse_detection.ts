import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import type { IErpHrmGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_refresh_token_reuse_detection(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new member account and obtain initial tokens
  const guestConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_guest_join(guestConnection, {});
  typia.assert(joinResponse);
  // Store the original refresh token
  const originalRefreshToken = joinResponse.token.refresh;
  // Step 2: Perform a successful refresh with the original token
  const refreshConnection1: api.IConnection = { host: connection.host };
  const refreshResponse1 = await authorize_guest_refresh(refreshConnection1, {
    body: {
      refreshToken: originalRefreshToken,
    } satisfies IErpHrmGuest.IRefresh,
  });
  typia.assert(refreshResponse1);
  // Store the new refresh token from the refresh response
  const newRefreshToken = refreshResponse1.token.refresh;
  // Step 3: Attempt to reuse the original (now invalidated) refresh token
  // This should trigger token reuse detection and return 403 Forbidden
  await TestValidator.httpError(
    "original token reuse should be detected",
    403,
    async () => {
      const refreshConnection2: api.IConnection = { host: connection.host };
      await authorize_guest_refresh(refreshConnection2, {
        body: {
          refreshToken: originalRefreshToken,
        } satisfies IErpHrmGuest.IRefresh,
      });
    },
  );
  // Step 4: Verify the new refresh token is also revoked
  // All tokens for the session should be revoked after reuse detection
  await TestValidator.httpError(
    "new token should also be revoked after reuse detection",
    [401, 403],
    async () => {
      const refreshConnection3: api.IConnection = { host: connection.host };
      await authorize_guest_refresh(refreshConnection3, {
        body: { refreshToken: newRefreshToken } satisfies IErpHrmGuest.IRefresh,
      });
    },
  );
}
