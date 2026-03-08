import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminSession";
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
  // Step 1: Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/register",
    referrer: "https://example.com",
    ip: "192.168.1.1",
  } satisfies ITodoAppAdminSession.IJoin;
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: adminJoinData,
  });
  typia.assert(adminAuthorized);
  // Step 2: Login to obtain tokens
  const loginConnection: api.IConnection = { host: connection.host };
  const loginData = {
    email: adminJoinData.email,
    password: adminJoinData.password,
    ip: "192.168.1.1",
    href: "https://example.com/login",
    referrer: "https://example.com",
  } satisfies ITodoAppAdminSession.ILogin;
  const loginAuthorized = await authorize_admin_login(loginConnection, {
    body: loginData,
  });
  typia.assert(loginAuthorized);
  const refreshToken = loginAuthorized.token.refresh;
  // Step 3: Refresh token with valid refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshData = {
    refresh_token: refreshToken,
    ip: "192.168.1.1",
    href: "https://example.com/refresh",
    referrer: "https://example.com",
  } satisfies ITodoAppAdminSession.IRefresh;
  const refreshAuthorized = await authorize_admin_refresh(refreshConnection, {
    body: refreshData,
  });
  typia.assert(refreshAuthorized);
  // Step 4: Verify new tokens are issued
  TestValidator.notEquals(
    "access token changed",
    loginAuthorized.token.access,
    refreshAuthorized.token.access,
  );
  TestValidator.notEquals(
    "refresh token changed",
    loginAuthorized.token.refresh,
    refreshAuthorized.token.refresh,
  );
  // Step 5: Verify expiration times are extended
  const oldExpiredAt = new Date(loginAuthorized.token.expired_at).getTime();
  const newExpiredAt = new Date(refreshAuthorized.token.expired_at).getTime();
  TestValidator.predicate(
    "expired_at extended",
    () => newExpiredAt > oldExpiredAt,
  );
  const oldRefreshableUntil = new Date(
    loginAuthorized.token.refreshable_until,
  ).getTime();
  const newRefreshableUntil = new Date(
    refreshAuthorized.token.refreshable_until,
  ).getTime();
  TestValidator.predicate(
    "refreshable_until extended",
    () => newRefreshableUntil > oldRefreshableUntil,
  );
  // Step 6: Test token rotation - old refresh token should be invalidated
  await TestValidator.error("old refresh token invalidated", async () => {
    await authorize_admin_refresh(connection, {
      body: {
        refresh_token: refreshToken,
        ip: "192.168.1.1",
        href: "https://example.com/refresh",
        referrer: "https://example.com",
      } satisfies ITodoAppAdminSession.IRefresh,
    });
  });
}
