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

export async function test_api_administrator_demotion_self_protection(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Authentication: Login as super administrator to get fresh connection
  const authConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_login(authConnection, {
    body: {
      email: typia.assert<string & tags.MaxLength<255> & tags.Format<"email">>(superAdmin.email),
      password: "1234", // Using same password as join
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(authorized);
  // Test: Attempt to demote self (super administrator demoting themselves)
  await TestValidator.error(
    "super administrator cannot demote themselves",
    async () => {
      await api.functional.shoppingMall.admin.administrators.demote(
        authConnection,
        {
          adminId: superAdmin.id,
        },
      );
    },
  );
}