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

export async function test_api_admin_token_refresh_expired(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account
  const joinAdminConnection: api.IConnection = { host: connection.host };
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ITodoAppAdminSession.IJoin;
  const adminAuthorized = await api.functional.todoApp.auth.admin.join(
    joinAdminConnection,
    {
      body: adminJoinInput,
    },
  );
  typia.assert(adminAuthorized);
  // Step 2: Login as admin to get initial tokens
  const loginAdminConnection: api.IConnection = { host: connection.host };
  const loginInput = {
    email: adminJoinInput.email,
    password: adminJoinInput.password,
    ip: "127.0.0.1",
    href: "http://localhost:3000",
    referrer: "http://localhost:3000/login",
  } satisfies ITodoAppAdminSession.ILogin;
  const adminLoginResponse = await api.functional.todoApp.auth.admin.login(
    loginAdminConnection,
    {
      body: loginInput,
    },
  );
  typia.assert(adminLoginResponse);
  // Step 3: Test refresh with completely invalid token (expired/revoked simulation)
  const invalidRefreshConnection: api.IConnection = { host: connection.host };
  const invalidRefreshInput = {
    refresh_token:
      "invalid-expired-refresh-token-" + RandomGenerator.alphaNumeric(20),
    href: "http://localhost:3000/dashboard",
    referrer: "http://localhost:3000/",
    ip: "127.0.0.1",
  } satisfies ITodoAppAdminSession.IRefresh;
  // Step 4: Call refresh with invalid token - should be rejected with 401
  await TestValidator.httpError(
    "expired/invalid refresh token should return 401",
    401,
    async () => {
      await api.functional.todoApp.auth.admin.refresh(
        invalidRefreshConnection,
        {
          body: invalidRefreshInput,
        },
      );
    },
  );
  // Step 5: Verify original session is still valid (not affected by failed refresh attempts)
  const stillValidConnection: api.IConnection = { host: connection.host };
  const stillValidRefreshInput = {
    refresh_token: adminLoginResponse.token.refresh,
    href: "http://localhost:3000/settings",
    referrer: "http://localhost:3000/dashboard",
    ip: "127.0.0.1",
  } satisfies ITodoAppAdminSession.IRefresh;
  const stillValidResponse = await api.functional.todoApp.auth.admin.refresh(
    stillValidConnection,
    {
      body: stillValidRefreshInput,
    },
  );
  typia.assert(stillValidResponse);
}
