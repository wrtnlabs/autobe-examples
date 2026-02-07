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

export async function test_api_administrator_refresh_valid_session(
  connection: api.IConnection,
): Promise<void> {
  // Use predefined test administrator credentials (system must have this account pre-seeded)
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_administrator_login(loginConnection, {
    body: {
      email: "test_admin@example.com",
    } satisfies IEconomicBoardAdministrator.ILogin,
  });
  typia.assert(loginResponse);
  // Verify that we have a valid access token and refresh token
  TestValidator.notEquals(
    "access token is not empty",
    loginResponse.token.access,
    "",
  );
  TestValidator.notEquals(
    "refresh token is not empty",
    loginResponse.token.refresh,
    "",
  );
  // 3. Perform refresh operation with valid refresh token (from cookie)
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResponse = await authorize_administrator_refresh(
    refreshConnection,
    {
      body: {} satisfies IEconomicBoardAdministrator.IRefresh,
    },
  );
  typia.assert(refreshResponse);
  // 4. Validate that new tokens were issued
  TestValidator.notEquals(
    "new access token different from old",
    loginResponse.token.access,
    refreshResponse.token.access,
  );
  TestValidator.notEquals(
    "new refresh token different from old",
    loginResponse.token.refresh,
    refreshResponse.token.refresh,
  );
  TestValidator.predicate("new access token has 20-minute expiration", () => {
    const now = new Date();
    const expiresAt = new Date(refreshResponse.token.expired_at);
    const diffMs = expiresAt.getTime() - now.getTime();
    return diffMs > 18 * 60 * 1000 && diffMs < 22 * 60 * 1000; // 18-22 minutes to allow for execution time
  });
  TestValidator.predicate("new refresh token has 14-day expiration", () => {
    const now = new Date();
    const refreshableUntil = new Date(refreshResponse.token.refreshable_until);
    const diffMs = refreshableUntil.getTime() - now.getTime();
    return (
      diffMs > 13 * 24 * 60 * 60 * 1000 && diffMs < 15 * 24 * 60 * 60 * 1000
    ); // 13-15 days to allow for execution time
  });
}
