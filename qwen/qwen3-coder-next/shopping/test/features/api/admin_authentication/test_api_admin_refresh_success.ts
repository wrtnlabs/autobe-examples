import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Login to obtain refresh token
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_admin_login(loginConnection, {
    body: {
      email: "admin-refresh-test@test.com",
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  typia.assert(loginResponse);
  const refreshToken = loginResponse.token.refresh;
  // 3. Refresh with valid refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResponse = await authorize_admin_refresh(refreshConnection, {
    body: {
      refresh: refreshToken,
    } satisfies IEcommerceMallAdmin.IRefresh,
  });
  typia.assert(refreshResponse);
  // 4. Verify new tokens are issued and old one is invalidated
  TestValidator.notEquals(
    "new access token",
    refreshResponse.token.access,
    loginResponse.token.access,
  );
  TestValidator.notEquals(
    "new refresh token",
    refreshResponse.token.refresh,
    refreshToken,
  );
  TestValidator.predicate(
    "access token valid",
    () => refreshResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token valid",
    () => refreshResponse.token.refresh.length > 0,
  );
  // 5. Verify old refresh token is invalidated
  const oldRefreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("old refresh token invalidated", async () => {
    await api.functional.ecommerceMall.auth.admin.refresh(
      oldRefreshConnection,
      {
        body: {
          refresh: refreshToken,
        } satisfies IEcommerceMallAdmin.IRefresh,
      },
    );
  });
}
