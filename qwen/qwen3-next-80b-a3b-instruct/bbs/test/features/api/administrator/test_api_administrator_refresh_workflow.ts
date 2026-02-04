import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_refresh_workflow(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Generate email and password for administrator account
  const testEmail: string = typia.random<string & tags.Format<"email">>();
  const testPassword: string = RandomGenerator.alphaNumeric(16);
  // Step 2: Create a new connection and join as administrator to create account
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_administrator_join(joinConnection, {
    body: {
      email: testEmail,
      password: testPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicDiscussionAdministrator.IJoin,
  });
  typia.assert(joinResponse);
  // Step 3: Create a new connection and login to establish session and obtain refresh token
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_administrator_login(loginConnection, {
    body: {
      email: testEmail,
      password: testPassword,
    } satisfies IEconomicDiscussionAdministrator.ILogin,
  });
  typia.assert(loginResponse);
  // Step 4: Extract refresh token from login response for refresh operation
  const loginRefreshToken = loginResponse.token.refresh;
  // Step 5: Create a new connection and refresh session using login refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResponse = await authorize_administrator_refresh(
    refreshConnection,
    {
      body: {
        refresh_token: loginRefreshToken,
      } satisfies IEconomicDiscussionAdministrator.IRefresh,
    },
  );
  typia.assert(refreshResponse);
  // Step 6: Verify that refresh operation produced new access token (different from login)
  TestValidator.notEquals(
    "refresh token generated new access token",
    loginResponse.token.access,
    refreshResponse.token.access,
  );
  // Step 7: Verify that refresh operation produced new refresh token (different from login)
  TestValidator.notEquals(
    "refresh token generated new refresh token",
    loginRefreshToken,
    refreshResponse.token.refresh,
  );
  // Step 8: Use the new refresh token to perform a second refresh
  const secondRefreshConnection: api.IConnection = { host: connection.host };
  const secondRefreshResponse = await authorize_administrator_refresh(
    secondRefreshConnection,
    {
      body: {
        refresh_token: refreshResponse.token.refresh,
      } satisfies IEconomicDiscussionAdministrator.IRefresh,
    },
  );
  typia.assert(secondRefreshResponse);
  // Step 9: Verify that second refresh produced another new access token
  TestValidator.notEquals(
    "second refresh generated new access token",
    refreshResponse.token.access,
    secondRefreshResponse.token.access,
  );
  // Step 10: Verify that second refresh produced another new refresh token
  TestValidator.notEquals(
    "second refresh generated new refresh token",
    refreshResponse.token.refresh,
    secondRefreshResponse.token.refresh,
  );
}
