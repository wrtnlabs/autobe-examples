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

export async function test_api_admin_token_refresh_rejected_for_revoked_or_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // 1) Register a new admin via join
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const joined = await authorize_admin_join(adminJoinConnection, {
    body: {
      email,
      password,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(joined);
  const originalRefreshToken: string = joined.token.refresh;
  // 2) Perform one successful refresh (rotation), keep the original refresh token
  const refreshConnection1: api.IConnection = { host: connection.host };
  const refreshed1 = await authorize_admin_refresh(refreshConnection1, {
    body: {
      refreshToken: originalRefreshToken,
    } satisfies IShoppingMallAdmin.IRefresh,
  });
  typia.assert(refreshed1);
  TestValidator.notEquals(
    "refresh rotation should change refresh token",
    originalRefreshToken,
    refreshed1.token.refresh,
  );
  // 3) Call refresh again using the ORIGINAL refresh token
  const refreshConnection2: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "revoked/original refresh token should be rejected",
    [401, 403],
    async () => {
      await authorize_admin_refresh(refreshConnection2, {
        body: {
          refreshToken: originalRefreshToken,
        } satisfies IShoppingMallAdmin.IRefresh,
      });
    },
  );
  // 4) Validate that ONLY the newest refresh token works (no extra tokens were issued for the original)
  const refreshConnection3: api.IConnection = { host: connection.host };
  const refreshed2 = await authorize_admin_refresh(refreshConnection3, {
    body: {
      refreshToken: refreshed1.token.refresh,
    } satisfies IShoppingMallAdmin.IRefresh,
  });
  typia.assert(refreshed2);
  TestValidator.notEquals(
    "subsequent refresh should rotate again",
    refreshed1.token.refresh,
    refreshed2.token.refresh,
  );
}
