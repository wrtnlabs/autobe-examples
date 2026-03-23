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
  // 1. Create new admin account
  const adminConnection1: api.IConnection = { host: connection.host };
  const passwordValue = RandomGenerator.alphaNumeric(16);
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: (passwordValue as string) satisfies string & tags.MinLength<8> & tags.Format<"password"> as string & tags.MinLength<8> & tags.Format<"password">,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ITodoAppAdminSession.IJoin;
  const adminAuth1 = await api.functional.todoApp.auth.admin.join(
    adminConnection1,
    {
      body: joinInput,
    },
  );
  typia.assert(adminAuth1);
  // 2. Login admin to obtain initial tokens
  const adminConnection2: api.IConnection = { host: connection.host };
  const loginInput: ITodoAppAdminSession.ILogin = {
    email: joinInput.email,
    password: joinInput.password,
    href: joinInput.href,
    referrer: joinInput.referrer,
    ip: joinInput.ip,
  };
  const adminAuth2 = await api.functional.todoApp.auth.admin.login(
    adminConnection2,
    {
      body: loginInput,
    },
  );
  typia.assert(adminAuth2);
  // 3. Extract refresh token and prepare for refresh
  const refreshToken = adminAuth2.refresh;
  // 4. Call refresh endpoint with valid refresh token
  const adminConnection3: api.IConnection = { host: connection.host };
  const refreshInput: ITodoAppAdminSession.IRefresh = {
    refresh_token: refreshToken,
  };
  const adminAuth3 = await api.functional.todoApp.auth.admin.refresh(
    adminConnection3,
    {
      body: refreshInput,
    },
  );
  typia.assert(adminAuth3);
  // 5. Verify new tokens are issued
  TestValidator.notEquals(
    "access token differs",
    adminAuth2.access,
    adminAuth3.access,
  );
  TestValidator.notEquals(
    "refresh token differs",
    adminAuth2.refresh,
    adminAuth3.refresh,
  );
  // 6. Validate token structure
  typia.assert<IAuthorizationToken>(adminAuth3.token);
}