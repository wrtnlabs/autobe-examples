import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_login_credentials_verification(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account with known credentials
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testPassword = RandomGenerator.alphaNumeric(16);
  const superAdminConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: testEmail,
      password: testPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  typia.assert(joinResult);
  TestValidator.equals("join email matches", joinResult.email, testEmail);
  // 2. Test login with correct email but wrong password - should fail
  const wrongPasswordConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("wrong password rejected", async () => {
    await authorize_super_admin_login(wrongPasswordConnection, {
      body: {
        email: testEmail,
        password: "WrongPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSuperAdmin.ILogin,
    });
  });
  // 3. Test login with non-existent email - should fail
  const nonExistentEmailConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("non-existent email rejected", async () => {
    await authorize_super_admin_login(nonExistentEmailConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: testPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSuperAdmin.ILogin,
    });
  });
  // 4. Test successful login with correct credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_super_admin_login(loginConnection, {
    body: {
      email: testEmail,
      password: testPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdmin.ILogin,
  });
  typia.assert(loginResult);
  TestValidator.equals("login email matches", loginResult.email, testEmail);
  TestValidator.equals(
    "login id matches join id",
    loginResult.id,
    joinResult.id,
  );
  TestValidator.predicate(
    "access token exists",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid date",
    new Date(loginResult.token.expired_at).getTime() > 0,
  );
  TestValidator.predicate(
    "refreshable_until is valid date",
    new Date(loginResult.token.refreshable_until).getTime() > 0,
  );
}
