import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_super_admin_profile_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account
  const adminEmail = typia.random<string & tags.Format<"email"> & tags.MaxLength<255>>();
  const adminPassword = "SuperAdmin123!";
  const adminConnection: api.IConnection = { host: connection.host };
  await api.functional.shoppingMall.auth.admin.join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Login as super administrator
  const loginResponse: IShoppingMallAdmin.IAuthorized =
    await api.functional.shoppingMall.auth.admin.login(adminConnection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IShoppingMallAdmin.ILogin,
    });
  typia.assert(loginResponse);
  // 3. Retrieve own profile (API returns void)
  await api.functional.shoppingMall.admin.admins.at(adminConnection, {
    adminId: loginResponse.id,
  });
  // 4. Validation: Verify login response contains expected fields
  typia.assertEquals(loginResponse);
}