import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_config_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super admin account
  const superAdminConnection: api.IConnection = { host: connection.host };
  await api.functional.shoppingMall.auth.super_admin.join(
    superAdminConnection,
    {
      body: typia.random<IShoppingMallSuperAdmin.IJoin>(),
    },
  );
  // 2. Login to obtain authentication tokens
  const loginResult = await authorize_super_admin_login(superAdminConnection, {
    body: typia.random<IShoppingMallSuperAdmin.ILogin>(),
  });
  typia.assert(loginResult);
  // 3. Delete a configuration (using a generated config ID)
  // Note: The delete endpoint returns void, so we rely on successful execution
  const configId = typia.random<string>();
  await api.functional.shoppingMall.superAdmin.configs.erase(
    superAdminConnection,
    {
      configId,
    },
  );
}
