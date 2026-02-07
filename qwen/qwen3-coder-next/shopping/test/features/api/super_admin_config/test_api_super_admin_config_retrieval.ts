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

export async function test_api_super_admin_config_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Super admin joins the system
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResponse = await api.functional.shoppingMall.auth.super_admin.join(
    superAdminConnection,
    {
      body: typia.random<IShoppingMallSuperAdmin.IJoin>(),
    },
  );
  typia.assert(authResponse);
  superAdminConnection.headers = {
    ...superAdminConnection.headers,
    Authorization: `Bearer ${authResponse.token.access}`,
  };
  // Step 2: Retrieve a specific configuration by ID
  const configId = typia.random<string & tags.Format<"uuid">>();
  const config = await api.functional.shoppingMall.superAdmin.configs.at(
    superAdminConnection,
    {
      configId,
    },
  );
  typia.assert(config);
  // Step 3: Verify configuration retrieval was successful
  TestValidator.predicate(
    "config retrieved successfully",
    () => config !== null,
  );
}
