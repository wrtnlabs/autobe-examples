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

export async function test_api_administrator_demotion_unauthorized_regular(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection with regular administrator privileges
  const adminConnection: api.IConnection = { host: connection.host };
  const regularAdmin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234" as const,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Create target super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234" as const,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Create a new connection for the regular admin to perform demotion attempt
  const demoteConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(demoteConnection, {
    body: {
      email: regularAdmin.email satisfies string as string,
      password: "1234" as const,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // Attempt to demote the super administrator - should fail due to insufficient privileges
  await TestValidator.error(
    "regular admin cannot demote super admin",
    async () => {
      await api.functional.shoppingMall.admin.administrators.demote(
        demoteConnection,
        {
          adminId: superAdmin.id,
        },
      );
    },
  );
}
