import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_login_wrong_password(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new admin account with known credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });
  // Step 2: Attempt login with correct email but WRONG password
  const wrongPassword = (adminPassword + "_wrong_suffix") as string &
    tags.Format<"password">;
  const wrongPasswordConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "login with wrong password should return 401",
    401,
    async () => {
      await authorize_admin_login(wrongPasswordConnection, {
        body: {
          email: adminEmail,
          password: wrongPassword,
        } satisfies IShoppingMallAdmin.ILogin,
      });
    },
  );
  // Step 3: Attempt login with a non-existent email
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();
  const nonExistentConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "login with non-existent email should return 401",
    401,
    async () => {
      await authorize_admin_login(nonExistentConnection, {
        body: {
          email: nonExistentEmail,
          password: typia.random<string & tags.Format<"password">>(),
        } satisfies IShoppingMallAdmin.ILogin,
      });
    },
  );
}
