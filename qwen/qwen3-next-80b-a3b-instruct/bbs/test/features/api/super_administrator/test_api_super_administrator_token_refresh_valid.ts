import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_token_refresh_valid(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create superAdministrator account
  const joinConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const joinResponse =
    await api.functional.economicBoard.auth.superAdministrator.join(
      joinConnection,
      {
        body: {} satisfies IEconomicBoardSuperAdministrator.IJoin,
      },
    );
  typia.assert(joinResponse);
  // 2. Log in to obtain refresh and access tokens
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse =
    await api.functional.economicBoard.auth.superAdministrator.login(
      loginConnection,
      {
        body: {} satisfies IEconomicBoardSuperAdministrator.ILogin,
      },
    );
  typia.assert(loginResponse);
  // Ensure access token is valid and has correct expiration
  const oldAccessToken = loginResponse.token.access;
  const oldRefreshToken = loginResponse.token.refresh;
  const oldRefreshedAt = loginResponse.token.expired_at;
  const oldRefreshableUntil = loginResponse.token.refreshable_until;
  // 3. Refresh token using the refresh endpoint
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResponse =
    await api.functional.economicBoard.auth.superAdministrator.refresh(
      refreshConnection,
      {
        body: {} satisfies IEconomicBoardSuperAdministrator.IRefresh,
      },
    );
  typia.assert(refreshResponse);
  // 4. Validate new access token
  const newAccessToken = refreshResponse.token.access;
  const newRefreshToken = refreshResponse.token.refresh;
  const newRefreshedAt = refreshResponse.token.expired_at;
  const newRefreshableUntil = refreshResponse.token.refreshable_until;
  TestValidator.notEquals(
    "old and new access tokens differ",
    oldAccessToken,
    newAccessToken,
  );
  TestValidator.notEquals(
    "old and new refresh tokens differ",
    oldRefreshToken,
    newRefreshToken,
  );
  // Validate expiration timestamps - access token should expire in ~15 minutes
  const now = new Date();
  const newExpiresAt = new Date(newRefreshedAt);
  const accessExpirationWindow = newExpiresAt.getTime() - now.getTime();
  TestValidator.predicate("access token expires in ~15 minutes", () => {
    const minExpected = 15 * 60 * 1000 - 120000; // 15 minutes minus 2 minute variance
    const maxExpected = 15 * 60 * 1000 + 120000; // 15 minutes plus 2 minute variance
    return (
      accessExpirationWindow >= minExpected &&
      accessExpirationWindow <= maxExpected
    );
  });
  // Validate refreshable_until - should be ~14 days (same as original login)
  const newRefreshableUntilDate = new Date(newRefreshableUntil);
  const oldRefreshableUntilDate = new Date(oldRefreshableUntil);
  TestValidator.equals(
    "refresh token lifetime unchanged",
    oldRefreshableUntilDate.getTime(),
    newRefreshableUntilDate.getTime(),
  );
}
