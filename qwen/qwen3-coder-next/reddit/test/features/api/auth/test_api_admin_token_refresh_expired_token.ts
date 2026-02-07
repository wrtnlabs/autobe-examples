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

export async function test_api_admin_token_refresh_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login as admin to obtain initial tokens
  const adminConnection: api.IConnection = { host: connection.host };
  const registered = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  typia.assert(registered);
  // 2. Login as admin to obtain refresh token
  const loginConnection: api.IConnection = { host: connection.host };
  const logged = await authorize_admin_login(loginConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IRedditPlatformAdmin.ILogin,
  });
  typia.assert(logged);
  // 3. Use expired refresh token (token that has passed refreshable_until)
  const expiredRefreshToken: IRedditPlatformAdmin.IRefresh = {
    refresh: logged.token.refresh,
  };
  // 4. Call refresh endpoint with expired token - expect 401 Unauthorized
  const refreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("expired refresh token", async () => {
    await api.functional.redditPlatform.auth.admin.refresh(refreshConnection, {
      body: expiredRefreshToken,
    });
  });
}
