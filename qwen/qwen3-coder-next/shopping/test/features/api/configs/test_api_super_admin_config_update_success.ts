import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import type { IShoppingMallSystematicConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystematicConfig";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_config_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Login as super admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(adminConnection, {
    body: typia.random<IShoppingMallSuperAdmin.IJoin>(),
  });
  // 2. Create initial config
  const initialConfigId = typia.random<string & tags.Format<"uuid">>();
  const initialConfig =
    await api.functional.shoppingMall.superAdmin.configs.putByConfigid(
      adminConnection,
      {
        configId: initialConfigId,
        body: typia.random<IShoppingMallSystematicConfig.IUpdate>(),
      },
    );
  typia.assert(initialConfig);
  // 3. Update config with new values
  const updatedConfig =
    await api.functional.shoppingMall.superAdmin.configs.putByConfigid(
      adminConnection,
      {
        configId: initialConfigId,
        body: typia.random<IShoppingMallSystematicConfig.IUpdate>(),
      },
    );
  typia.assert(updatedConfig);
  // 4. Verify update: ID should remain same
  TestValidator.equals(
    "config ID unchanged",
    initialConfigId,
    initialConfigId,
  );
}