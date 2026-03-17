import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_session_refresh_token_rotation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new super administrator to get an initial session with tokens
  const superAdminConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_super_admin_join(superAdminConnection, {});
  typia.assert(joinResult);
  // Record the original refresh token
  const originalRefreshToken: string = joinResult.token.refresh;
  // Step 2: Use the original refresh token to obtain a new token pair (first rotation)
  const refreshConnection1: api.IConnection = { host: connection.host };
  const firstRefreshResult = await authorize_super_admin_refresh(
    refreshConnection1,
    {
      body: {
        refresh: originalRefreshToken,
      } satisfies IShoppingMallSuperAdmin.IRefresh,
    },
  );
  typia.assert(firstRefreshResult);
  // Step 3: Validate the first refresh returned different tokens
  TestValidator.notEquals(
    "new refresh token differs from original",
    firstRefreshResult.token.refresh,
    originalRefreshToken,
  );
  TestValidator.notEquals(
    "new access token differs from original",
    firstRefreshResult.token.access,
    joinResult.token.access,
  );
  // Record the newly issued refresh token
  const newRefreshToken: string = firstRefreshResult.token.refresh;
  // Step 4: Attempt to replay the original (now-invalidated) refresh token — must be rejected
  await TestValidator.httpError(
    "original refresh token is invalidated after rotation",
    401,
    async () => {
      const replayConnection: api.IConnection = { host: connection.host };
      await authorize_super_admin_refresh(replayConnection, {
        body: {
          refresh: originalRefreshToken,
        } satisfies IShoppingMallSuperAdmin.IRefresh,
      });
    },
  );
  // Step 5: Confirm the newly issued refresh token from step 2 is still valid
  const refreshConnection2: api.IConnection = { host: connection.host };
  const secondRefreshResult = await authorize_super_admin_refresh(
    refreshConnection2,
    {
      body: {
        refresh: newRefreshToken,
      } satisfies IShoppingMallSuperAdmin.IRefresh,
    },
  );
  typia.assert(secondRefreshResult);
  // Validate second refresh also rotated the token
  TestValidator.notEquals(
    "second rotation produces new refresh token",
    secondRefreshResult.token.refresh,
    newRefreshToken,
  );
}
