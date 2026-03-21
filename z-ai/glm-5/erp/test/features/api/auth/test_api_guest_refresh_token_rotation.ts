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

export async function test_api_guest_refresh_token_rotation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new guest account and obtain initial tokens
  const guestConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_guest_join(guestConnection, {});
  typia.assert(initialAuth);
  const initialAccessToken = initialAuth.token.access;
  const initialRefreshToken = initialAuth.token.refresh;
  // 2. Call refresh endpoint with initial refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_guest_refresh(refreshConnection, {
    body: { refreshToken: initialRefreshToken } satisfies IErpHrmGuest.IRefresh,
  });
  typia.assert(refreshedAuth);
  // 3. Verify new tokens are different from initial tokens
  TestValidator.notEquals(
    "new access token should differ from initial access token",
    refreshedAuth.token.access,
    initialAccessToken,
  );
  TestValidator.notEquals(
    "new refresh token should differ from initial refresh token",
    refreshedAuth.token.refresh,
    initialRefreshToken,
  );
  // 4. Verify old refresh token is now invalidated
  await TestValidator.error(
    "old refresh token should be invalidated",
    async () => {
      const invalidConnection: api.IConnection = { host: connection.host };
      await authorize_guest_refresh(invalidConnection, {
        body: {
          refreshToken: initialRefreshToken,
        } satisfies IErpHrmGuest.IRefresh,
      });
    },
  );
  // 5. Verify new refresh token can be used for subsequent refresh
  const secondRefreshConnection: api.IConnection = { host: connection.host };
  const secondRefreshedAuth = await authorize_guest_refresh(
    secondRefreshConnection,
    {
      body: {
        refreshToken: refreshedAuth.token.refresh,
      } satisfies IErpHrmGuest.IRefresh,
    },
  );
  typia.assert(secondRefreshedAuth);
  // Verify second refresh also produces different tokens
  TestValidator.notEquals(
    "second refresh access token should differ from first refresh access token",
    secondRefreshedAuth.token.access,
    refreshedAuth.token.access,
  );
  TestValidator.notEquals(
    "second refresh token should differ from first refresh token",
    secondRefreshedAuth.token.refresh,
    refreshedAuth.token.refresh,
  );
}
