import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as a new administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials: IEconomicBoardAdministrator.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };
  const joinedAdmin = await authorize_administrator_join(adminConnection, {
    body: adminCredentials,
  });
  typia.assert(joinedAdmin);
  // 2. Simulate access token expiration by using the refresh endpoint
  // The refresh token is stored in the HTTP-only cookie from the join response
  const refreshedAdmin = await authorize_administrator_refresh(
    adminConnection,
    { body: {} },
  );
  typia.assert(refreshedAdmin);
  // 3. Verify new access token and refresh token are issued
  TestValidator.notEquals(
    "new access token differs from old",
    joinedAdmin.access_token,
    refreshedAdmin.access_token,
  );
  TestValidator.notEquals(
    "new refresh token differs from old",
    joinedAdmin.refresh_token,
    refreshedAdmin.refresh_token,
  );
  // 4. Verify new token expiration times are correct
  // Access token should have 15-minute expiry (approx. 900 seconds)
  const oldAccessTokenExpire = new Date(joinedAdmin.token.expired_at).getTime();
  const newAccessTokenExpire = new Date(
    refreshedAdmin.token.expired_at,
  ).getTime();
  const accessTokenExpiryDiff = newAccessTokenExpire - oldAccessTokenExpire;
  TestValidator.predicate(
    "new access token expires in approx 15 minutes",
    Math.abs(accessTokenExpiryDiff - 15 * 60 * 1000) < 5000,
  );
  // Refresh token should have 14-day expiry (approx. 1,209,600 seconds)
  const oldRefreshTokenExpire = new Date(
    joinedAdmin.token.refreshable_until,
  ).getTime();
  const newRefreshTokenExpire = new Date(
    refreshedAdmin.token.refreshable_until,
  ).getTime();
  const refreshTokenExpiryDiff = newRefreshTokenExpire - oldRefreshTokenExpire;
  TestValidator.predicate(
    "new refresh token expires in approx 14 days",
    Math.abs(refreshTokenExpiryDiff - 14 * 24 * 60 * 60 * 1000) < 5000,
  );
  // 5. Validate that old refresh token is invalidated by trying to use it directly as Authorization header
  const oldTokenConnection: api.IConnection = { host: connection.host };
  oldTokenConnection.headers = {
    Authorization: `Bearer ${joinedAdmin.refresh_token}`,
  };
  await TestValidator.error(
    "old refresh token rejected after refresh",
    async () => {
      await authorize_administrator_refresh(oldTokenConnection, { body: {} });
    },
  );
  // 6. Validate that new connection with new tokens works
  const newRefreshConnection: api.IConnection = { host: connection.host };
  const rerefreshedAdmin = await authorize_administrator_refresh(
    newRefreshConnection,
    { body: {} },
  );
  typia.assert(rerefreshedAdmin);
  TestValidator.notEquals(
    "second refresh token differs from first",
    refreshedAdmin.refresh_token,
    rerefreshedAdmin.refresh_token,
  );
}
