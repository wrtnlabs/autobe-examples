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

export async function test_api_super_admin_config_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate as super admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(adminConnection, {
    body: typia.random<IShoppingMallSuperAdmin.ILogin>(),
  });
  // 2. Create update body with new values
  const updateBody: IShoppingMallSystematicConfig.IUpdate = {
    value: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallSystematicConfig.IUpdate;
  // 3. Update the configuration
  const updatedConfig =
    await api.functional.shoppingMall.superAdmin.configs.patch(
      adminConnection,
      {
        body: updateBody,
      },
    );
  typia.assert(updatedConfig);
}
