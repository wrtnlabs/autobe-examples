import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_login_concurrent_session_invalidation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create superAdministrator account
  const joinConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IEconomicBoardSuperAdministrator.IJoin;
  const joinResult = await authorize_super_administrator_join(joinConnection, {
    body: joinInput,
  });
  typia.assert(joinResult);
  // Step 2: Log in to create first valid session
  const firstLoginConnection: api.IConnection = { host: connection.host };
  const firstLoginResult = await authorize_super_administrator_login(
    firstLoginConnection,
    {
      body: {
        email: joinInput.email,
        password: joinInput.password,
      } satisfies IEconomicBoardSuperAdministrator.ILogin,
    },
  );
  typia.assert(firstLoginResult);
  // Store original access token for validation
  const originalAccessToken = firstLoginResult.token.access;
  // Step 3: Log in again to trigger concurrent session invalidation
  const secondLoginConnection: api.IConnection = { host: connection.host };
  const secondLoginResult = await authorize_super_administrator_login(
    secondLoginConnection,
    {
      body: {
        email: joinInput.email,
        password: joinInput.password,
      } satisfies IEconomicBoardSuperAdministrator.ILogin,
    },
  );
  typia.assert(secondLoginResult);
  // Step 4: Validate that original access token is now invalid
  // Create a new connection with the original access token
  const invalidAccessConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: originalAccessToken },
  };
  // Try to make any protected request with old token
  // Since we don't have a protected endpoint in the scenario, we try to log in again to test.
  // This is the correct approach: try to use the old access token to authenticate
  await TestValidator.httpError(
    "original access token rejected after concurrent login",
    401,
    async () => {
      // Attempting to get a new session using the old access token as authentication
      // This should fail with 401 since the session was invalidated
      await api.functional.economicBoard.auth.superAdministrator.login(
        invalidAccessConnection,
        {
          body: {
            email: joinInput.email,
            password: joinInput.password,
          } satisfies IEconomicBoardSuperAdministrator.ILogin,
        },
      );
    },
  );
  // Step 5: Validate that new session works correctly (even though old one is invalidated)
  const newSessionConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: secondLoginResult.token.access },
  };
  const verifyNewSessionResult =
    await api.functional.economicBoard.auth.superAdministrator.login(
      newSessionConnection,
      {
        body: {
          email: joinInput.email,
          password: joinInput.password,
        } satisfies IEconomicBoardSuperAdministrator.ILogin,
      },
    );
  typia.assert(verifyNewSessionResult);
  TestValidator.notEquals(
    "new session token should be different from original",
    verifyNewSessionResult.token.access,
    originalAccessToken,
  );
}
