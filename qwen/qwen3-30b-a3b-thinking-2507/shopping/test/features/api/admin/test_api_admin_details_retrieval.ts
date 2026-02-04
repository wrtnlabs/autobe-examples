import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_details_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new admin account using authorize_admin_join utility function
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    connection,
    {
      body: {},
    },
  );
  // 2. Create a new connection with the admin's authentication token
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: admin.id satisfies string as string,
      password: "1234",
      href: "/login",
      referrer: "/dashboard",
    },
  });
  // 3. Retrieve the admin's details using adminConnection
  const details: IShoppingMallAdmin =
    await api.functional.shoppingMall.admin.admins.at(adminConnection, {
      adminId: admin.id,
    });
  // 4. Validate the response using typia.assert
  typia.assert(details);
  // 5. Validate that the retrieved details match the created admin
  TestValidator.equals("admin ID matches", details.id, admin.id);
}
