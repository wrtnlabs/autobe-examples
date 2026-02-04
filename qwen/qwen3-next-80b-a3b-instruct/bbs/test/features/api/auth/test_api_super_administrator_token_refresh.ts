import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_token_refresh(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new super administrator to obtain initial refresh token
  const superAdminCreds: IEconomicDiscussionSuperAdministrator.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    display_name: typia.random<
      string & tags.MinLength<1> & tags.MaxLength<100>
    >(),
  };
  const superAdminConnection: api.IConnection = { host: connection.host };
  const initialAuth: IEconomicDiscussionSuperAdministrator.IAuthorized =
    await authorize_super_administrator_join(superAdminConnection, {
      body: superAdminCreds,
    });
  typia.assert(initialAuth);
  // Step 2: Extract the initial refresh token from the authorized response
  const initialRefreshToken: string = initialAuth.token.refresh;
  // Step 3: Create a new connection for the refresh operation
  const refreshConnection: api.IConnection = { host: connection.host };
  // Step 4: Call the refresh endpoint with the valid refresh token
  const refreshRequest: IEconomicDiscussionSuperAdministrator.IRefresh = {
    token: initialRefreshToken,
  };
  const refreshedAuth: IEconomicDiscussionSuperAdministrator.IAuthorized =
    await authorize_super_administrator_refresh(refreshConnection, {
      body: refreshRequest,
    });
  typia.assert(refreshedAuth);
  // Validate that the new tokens are issued with different refresh token
  TestValidator.notEquals(
    "new refresh token is different from old token",
    refreshedAuth.token.refresh,
    initialRefreshToken,
  );
  // Step 6: Verify the old refresh token is invalidated by attempting to use it again
  const staleRefreshRequest: IEconomicDiscussionSuperAdministrator.IRefresh = {
    token: initialRefreshToken,
  };
  await TestValidator.error(
    "previous refresh token should be invalidated",
    async () => {
      await authorize_super_administrator_refresh(refreshConnection, {
        body: staleRefreshRequest,
      });
    },
  );
}
