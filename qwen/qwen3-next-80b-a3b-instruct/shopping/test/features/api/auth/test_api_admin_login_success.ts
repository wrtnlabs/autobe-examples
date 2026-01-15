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
  // Step 1: Create new administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/admin/join",
    referrer: "https://example.com/admin/signup",
  } satisfies IShoppingMallAdmin.IJoin;
  const registeredAdmin = await authorize_admin_join(adminConnection, {
    body: adminCredentials,
  });
  typia.assert(registeredAdmin);
  // Step 2: Use the registered admin credentials for login
  const loginConnection: api.IConnection = { host: connection.host };
  const loginCredentials = {
    email: registeredAdmin.email,
    password: adminCredentials.password,
  } satisfies IShoppingMallAdmin.ILogin;
  const loginResult = await authorize_admin_login(loginConnection, {
    body: loginCredentials,
  });
  typia.assert(loginResult);
  // Step 3: Validate the login result contains all required business properties
  TestValidator.equals(
    "admin ID matches registered admin ID",
    loginResult.id,
    registeredAdmin.id,
  );
  TestValidator.equals(
    "admin name matches",
    loginResult.name,
    registeredAdmin.name,
  );
  TestValidator.equals(
    "admin email matches",
    loginResult.email,
    registeredAdmin.email,
  );
  TestValidator.equals(
    "admin created_at matches",
    loginResult.createdAt,
    registeredAdmin.createdAt,
  );
  TestValidator.equals(
    "admin role matches",
    loginResult.role,
    registeredAdmin.role,
  );
  TestValidator.equals("admin status is active", loginResult.status, "active");
  TestValidator.equals(
    "permissions array length matches",
    loginResult.permissions.length,
    registeredAdmin.permissions.length,
  );
  // Validate token structure
  TestValidator.equals(
    "access token exists",
    loginResult.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "refresh token exists",
    loginResult.token.refresh.length > 0,
    true,
  );
  const now = new Date();
  TestValidator.predicate(
    "expired_at is in future",
    new Date(loginResult.token.expired_at) > now,
  );
  TestValidator.predicate(
    "refreshable_until is in future",
    new Date(loginResult.token.refreshable_until) > now,
  );
}
