import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a new admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Create a new admin account using utility function
  const randomEmail = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const adminData = {
    email: randomEmail,
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const adminAccount = await authorize_admin_join(adminConnection, {
    body: adminData,
  });
  typia.assert(adminAccount);
  // Attempt login with the created admin credentials
  const loginData = {
    email: adminData.email,
    password: adminData.password,
    href: "https://example.com/admin/login",
    referrer: "https://example.com/admin/dashboard",
  } satisfies IShoppingMallAdmin.ILogin;
  const loginResult = await authorize_admin_login(adminConnection, {
    body: loginData,
  });
  typia.assert(loginResult);
  // Verify critical data from the authentication response
  TestValidator.equals(
    "admin ID than account",
    loginResult.id,
    adminAccount.id,
  );
  TestValidator.equals(
    "admin email matches account",
    loginResult.email,
    adminAccount.email,
  );
}
