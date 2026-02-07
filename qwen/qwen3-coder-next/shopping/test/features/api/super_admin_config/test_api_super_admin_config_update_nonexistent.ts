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

export async function test_api_super_admin_config_update_nonexistent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and login as super admin
  const adminConnection: api.IConnection = { host: connection.host };
  await api.functional.shoppingMall.auth.super_admin.join(adminConnection, {
    body: {},
  });
  // 2. Login as super admin
  await api.functional.shoppingMall.auth.super_admin.login(adminConnection, {
    body: {},
  });
  // 3. Attempt to update non-existent configuration key
  // Expected: 404 error for non-existent config key
  await TestValidator.error(
    "should fail to update non-existent configuration key",
    async () => {
      await api.functional.shoppingMall.superAdmin.configs.patch(
        adminConnection,
        {
          body: {
            key: "non_existent_config_key",
            value: JSON.stringify({ enabled: true }),
          },
        },
      );
    },
  );
}
