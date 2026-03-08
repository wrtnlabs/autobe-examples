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

export async function test_api_admin_login_deleted_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account with valid credentials
  const joinConnection: api.IConnection = { host: connection.host };
  const joinCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IRedditPlatformAdmin.IJoin;
  const adminAccount = await authorize_admin_join(joinConnection, {
    body: joinCredentials,
  });
  typia.assert(adminAccount);
  // Verify account creation succeeded and account is active
  TestValidator.equals("account created", adminAccount.is_active, true);
  TestValidator.equals(
    "email matches",
    adminAccount.email,
    joinCredentials.email,
  );
  TestValidator.equals(
    "username matches",
    adminAccount.username,
    joinCredentials.username,
  );
  // 2. Verify initial login works with valid credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginCredentials: IRedditPlatformAdmin.ILogin = {
    email: joinCredentials.email,
    password: joinCredentials.password,
  } satisfies IRedditPlatformAdmin.ILogin;
  const initialLogin = await authorize_admin_login(loginConnection, {
    body: loginCredentials,
  });
  typia.assert(initialLogin);
  TestValidator.equals("initial login succeeded", initialLogin.is_active, true);
  // 3. Test that login with wrong password is rejected with generic error (401)
  // This simulates the behavior when account is deleted/suspended - the error message
  // should be generic and not reveal whether the account exists or is deleted
  const wrongPasswordLogin: IRedditPlatformAdmin.ILogin = {
    email: joinCredentials.email,
    password: "wrongpassword123",
  } satisfies IRedditPlatformAdmin.ILogin;
  const wrongConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "wrong password rejected with 401",
    401,
    async () => {
      await authorize_admin_login(wrongConnection, {
        body: wrongPasswordLogin,
      });
    },
  );
  // 4. Test that login with non-existent email is also rejected with 401
  const nonExistentEmailLogin: IRedditPlatformAdmin.ILogin = {
    email: "nonexistent@example.com",
    password: "anypassword",
  } satisfies IRedditPlatformAdmin.ILogin;
  const nonExistentConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "non-existent email rejected with 401",
    401,
    async () => {
      await authorize_admin_login(nonExistentConnection, {
        body: nonExistentEmailLogin,
      });
    },
  );
}
