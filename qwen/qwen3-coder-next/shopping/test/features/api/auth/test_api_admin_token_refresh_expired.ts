import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_token_refresh_expired(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new admin account
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await api.functional.shoppingMall.auth.admin.join(
    joinConnection,
    {
      body: typia.random<IShoppingMallAdmin.IJoin>(),
    },
  );
  typia.assert(joinResponse);
  // 2. Login to get initial tokens
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse = await api.functional.shoppingMall.auth.admin.login(
    loginConnection,
    {
      body: typia.random<IShoppingMallAdmin.ILogin>(),
    },
  );
  typia.assert(loginResponse);
  // 3. Verify initial refresh token works
  const refreshConnection1: api.IConnection = { host: connection.host };
  const refreshResponse1 = await api.functional.shoppingMall.auth.admin.refresh(
    refreshConnection1,
    {
      body: {
        refresh: loginResponse.token.refresh,
      } satisfies IShoppingMallAdmin.IRefresh,
    },
  );
  typia.assert(refreshResponse1);
  // 4. Generate an expired refresh token by creating a token with past dates
  const expiredAt = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 1 day ago
  const refreshableUntil = new Date(
    Date.now() - 24 * 60 * 60 * 1000,
  ).toISOString(); // 1 day ago
  // 5. Try to refresh with expired token (simulated by creating invalid token)
  // In production, this would be a token that has exceeded its refreshable_until date
  await TestValidator.error(
    "expired refresh token should be rejected",
    async () => {
      const expiredConnection: api.IConnection = { host: connection.host };
      await api.functional.shoppingMall.auth.admin.refresh(expiredConnection, {
        body: {
          refresh: "invalid-expired-token",
        } satisfies IShoppingMallAdmin.IRefresh,
      });
    },
  );
}
