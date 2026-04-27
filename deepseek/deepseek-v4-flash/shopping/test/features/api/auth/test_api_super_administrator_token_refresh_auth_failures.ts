import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_token_refresh_auth_failures(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a super administrator account to obtain valid authentication tokens
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_administrator_join(
    adminConnection,
    {},
  );
  typia.assert(authorized);
  const originalRefreshToken: string = authorized.token.refresh;
  // Step 2: Successfully refresh with the valid token (consumes/rotates the old token)
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_super_administrator_refresh(
    refreshConnection,
    {
      body: {
        refreshToken: originalRefreshToken,
      } satisfies IECommerceMallSuperAdministrator.IRefresh,
    },
  );
  typia.assert(refreshed);
  // Step 3: Test consumed/rotated token
  // Using the same refresh token again after rotation must return 401
  await TestValidator.httpError(
    "consumed refresh token should return 401",
    401,
    async () => {
      const failConnection: api.IConnection = { host: connection.host };
      await api.functional.eCommerceMall.auth.superAdministrator.refresh(
        failConnection,
        {
          body: {
            refreshToken: originalRefreshToken,
          } satisfies IECommerceMallSuperAdministrator.IRefresh,
        },
      );
    },
  );
  // Step 4: Test token with no matching session
  // A random string as refresh token corresponds to no session record
  await TestValidator.httpError(
    "non-existent session token should return 401",
    401,
    async () => {
      const noSessionConnection: api.IConnection = { host: connection.host };
      await api.functional.eCommerceMall.auth.superAdministrator.refresh(
        noSessionConnection,
        {
          body: {
            refreshToken: RandomGenerator.alphaNumeric(100),
          } satisfies IECommerceMallSuperAdministrator.IRefresh,
        },
      );
    },
  );
}
