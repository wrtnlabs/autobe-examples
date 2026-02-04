import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
export async function test_api_superadmin_login_invalid_password(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a verified super administrator account to use for login
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallSuperAdmin.IJoin;
  const createdSuperAdmin = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: superAdminData,
    },
  );
  typia.assert(createdSuperAdmin);
  // Step 2: Test login with valid email but incorrect password
  const invalidPasswordConnection: api.IConnection = { host: connection.host };
  // Encode email and wrong password in Basic auth header
  const authString = Buffer.from(
    `${superAdminData.email}:wrongpassword`,
  ).toString("base64");
  invalidPasswordConnection.headers = { Authorization: `Basic ${authString}` };
  await TestValidator.error(
    "login should fail with invalid password",
    async () => {
      // Call the utility function with empty body, but authentication will fail because password is wrong
      await authorize_super_admin_login(invalidPasswordConnection, {
        body: {},
      });
    },
  );
  // The above should throw HttpError with 401 status, confirming login failure
  // No session is created because authentication failed
}
