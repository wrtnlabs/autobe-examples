import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create new admin user
  const adminConnection: api.IConnection = { host: connection.host };
  const createdAdmin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePassword123!",
    } satisfies IEconPoliticBoardAdmin.IJoin,
  });
  // Step 2: Authenticate as admin to get initial tokens
  const initialLogin = await authorize_admin_login(adminConnection, {
    body: {
      email: createdAdmin.email,
      password: "SecurePassword123!",
    } satisfies IEconPoliticBoardAdmin.ILogin,
  });
  // Step 3: Validate initial access token expiration
  const now = new Date();
  const oneHour = 1000 * 60 * 60;
  const validAccessExpiration = new Date(now.getTime() + oneHour).toISOString();
  TestValidator.equals(
    "initial access token expiration should be 1 hour",
    initialLogin.token.expired_at,
    validAccessExpiration,
  );
  // Validate initial refresh token expiration
  const thirtyDays = 1000 * 60 * 60 * 24 * 30;
  const validRefreshExpiration = new Date(
    now.getTime() + thirtyDays,
  ).toISOString();
  TestValidator.equals(
    "initial refresh token expiration should be 30 days",
    initialLogin.token.refreshable_until,
    validRefreshExpiration,
  );
  // Step 4: Refresh tokens using the initial refresh token
  const refreshToken = initialLogin.token.refresh;
  const refreshedTokens = await authorize_admin_refresh(adminConnection, {
    body: {
      refreshToken,
    } satisfies IEconPoliticBoardAdmin.IRefresh,
  });
  // Step 5: Verify new tokens have correct expiration
  const newAccessExpiration = new Date(now.getTime() + oneHour).toISOString();
  TestValidator.equals(
    "new access token expiration should be 1 hour",
    refreshedTokens.token.expired_at,
    newAccessExpiration,
  );
  const newRefreshExpiration = new Date(
    now.getTime() + thirtyDays,
  ).toISOString();
  TestValidator.equals(
    "new refresh token expiration should be 30 days",
    refreshedTokens.token.refreshable_until,
    newRefreshExpiration,
  );
  // Step 6: Verify old refresh token is invalidated
  await TestValidator.error(
    "old refresh token should no longer work after refresh",
    async () => {
      await authorize_admin_refresh(adminConnection, {
        body: {
          refreshToken,
        } satisfies IEconPoliticBoardAdmin.IRefresh,
      });
    },
  );
}
