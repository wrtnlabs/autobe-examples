import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_refresh_invalid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(admin);
  // 2. Login to establish valid session with refresh token
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_administrator_login(
    adminLoginConnection,
    {
      body: {
        email: admin.email,
        password: adminPassword,
        ip: "127.0.0.1",
        referrer: "https://admin.example.com",
      } satisfies IEcommerceMallAdministrator.ILogin,
    },
  );
  typia.assert(loginResponse);
  // 3. Attempt refresh with invalid token (random string, not valid JWT format)
  const invalidRefreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "should reject invalid refresh token",
    [401],
    async () => {
      // Use a completely random string that is not a valid JWT format
      const invalidToken = typia.random<string & tags.MaxLength<64>>();
      await authorize_administrator_refresh(invalidRefreshConnection, {
        body: {
          refresh_token: invalidToken,
        } satisfies IEcommerceMallAdministrator.IRefresh,
      });
    },
  );
  // 4. Verify valid refresh token still works
  const validRefreshConnection: api.IConnection = { host: connection.host };
  const refreshedTokens = await authorize_administrator_refresh(
    validRefreshConnection,
    {
      body: {
        refresh_token: loginResponse.token.refresh,
      } satisfies IEcommerceMallAdministrator.IRefresh,
    },
  );
  typia.assert(refreshedTokens);
  TestValidator.notEquals(
    "refreshed token should differ from original",
    loginResponse.token.refresh,
    refreshedTokens.token.refresh,
  );
}
