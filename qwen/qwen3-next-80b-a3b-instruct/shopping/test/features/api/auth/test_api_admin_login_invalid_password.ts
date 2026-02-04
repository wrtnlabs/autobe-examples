import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_login_invalid_password(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a valid admin account for testing
  const adminConnection: api.IConnection = { host: connection.host };
  const adminInfo = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/join",
    referrer: "https://example.com",
    ip: "192.168.1.1",
  } satisfies IShoppingMallAdmin.IJoin;
  await authorize_admin_join(adminConnection, { body: adminInfo });
  // Step 2: Attempt login with correct email but invalid password
  const invalidLogin = {
    email: adminInfo.email,
    password: "wrongpassword123", // Different from the password used to create account
  } satisfies IShoppingMallAdmin.ILogin;
  // Step 3: Validate that login with invalid password returns 401 Unauthorized
  // Use the utility function for login as required by priority rules
  const loginConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "admin login with invalid password should return 401 Unauthorized",
    async () => {
      await authorize_admin_login(loginConnection, { body: invalidLogin });
    },
  );
}
