import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_refresh_blocked_account(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(joined);
  const firstRefreshToken: string = joined.token.refresh;
  const refreshed = await authorize_administrator_refresh(
    { host: connection.host },
    {
      body: {
        refreshToken: firstRefreshToken,
      } satisfies IMallPlatformAdministrator.IRefresh,
    },
  );
  typia.assert(refreshed);
  TestValidator.notEquals(
    "refresh should issue a new access token",
    joined.token.access,
    refreshed.token.access,
  );
  TestValidator.notEquals(
    "refresh should issue a new refresh token",
    joined.token.refresh,
    refreshed.token.refresh,
  );
  TestValidator.notEquals(
    "refresh should update access expiration",
    joined.token.expired_at,
    refreshed.token.expired_at,
  );
  TestValidator.notEquals(
    "refresh should update refreshability window",
    joined.token.refreshable_until,
    refreshed.token.refreshable_until,
  );
}
