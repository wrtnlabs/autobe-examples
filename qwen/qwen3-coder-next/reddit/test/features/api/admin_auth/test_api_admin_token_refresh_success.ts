import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
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
  // 1. Register new admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_admin_join(adminConnection, {
    body: typia.random<IRedditPlatformAdmin.IJoin>(),
  });
  typia.assert(joined);
  // 2. Login as admin to obtain initial refresh token
  const loggedConnection: api.IConnection = { host: connection.host };
  const logged = await authorize_admin_login(loggedConnection, {
    body: typia.random<IRedditPlatformAdmin.ILogin>(),
  });
  typia.assert(logged);
  // 3. Refresh token using refresh token from login
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_admin_refresh(refreshConnection, {
    body: {
      refresh: logged.token.refresh,
    } satisfies IRedditPlatformAdmin.IRefresh,
  });
  typia.assert(refreshed);
  // 4. Validate refresh response structure
  TestValidator.equals(
    "new access token differs from original",
    refreshed.token.access,
    logged.token.access,
  );
  TestValidator.equals(
    "new refresh token differs from original",
    refreshed.token.refresh,
    logged.token.refresh,
  );
  TestValidator.predicate(
    "new access token expires after original",
    new Date(refreshed.token.expired_at).getTime() >
      new Date(logged.token.expired_at).getTime(),
  );
  TestValidator.predicate(
    "new refresh token is refreshable after original",
    new Date(refreshed.token.refreshable_until).getTime() >
      new Date(logged.token.refreshable_until).getTime(),
  );
}
