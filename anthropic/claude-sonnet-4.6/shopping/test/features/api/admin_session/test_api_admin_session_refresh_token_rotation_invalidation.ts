import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_session_refresh_token_rotation_invalidation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create a new admin account and obtain the initial tokens
  const adminConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_admin_join(adminConnection, {});
  typia.assert(joinResult);
  // Extract the original refresh token
  const originalRefreshToken = joinResult.token.refresh;
  // 2. First refresh: use the original refresh token - should succeed
  const refreshConnection: api.IConnection = { host: connection.host };
  const firstRefreshResult = await authorize_admin_refresh(refreshConnection, {
    body: {
      refresh_token: originalRefreshToken,
    } satisfies IShoppingMallAdmin.IRefresh,
  });
  typia.assert(firstRefreshResult);
  // 3. Validate: new refresh token differs from the original
  TestValidator.notEquals(
    "new refresh token must differ from original",
    firstRefreshResult.token.refresh,
    originalRefreshToken,
  );
  // 4. Attempt to reuse the original (now-invalidated) refresh token - must fail with 401
  await TestValidator.httpError(
    "reusing invalidated refresh token must return 401",
    401,
    async () => {
      const reuseConnection: api.IConnection = { host: connection.host };
      await authorize_admin_refresh(reuseConnection, {
        body: {
          refresh_token: originalRefreshToken,
        } satisfies IShoppingMallAdmin.IRefresh,
      });
    },
  );
}
