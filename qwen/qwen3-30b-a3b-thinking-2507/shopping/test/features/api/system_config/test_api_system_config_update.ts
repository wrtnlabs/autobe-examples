import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSystemConfig";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_ecommerce_admin_system_configs_create } from "../../../generate/generate_random_ecommerce_admin_system_configs_create";
import { prepare_random_ecommerce_system_config } from "../../../prepare/prepare_random_ecommerce_system_config";

export async function test_api_system_config_update(
  connection: api.IConnection,
) {
  // 1. Admin login
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IEcommerceAdmin.IJoin,
  });
  // 2. Create new system config
  const configKey = RandomGenerator.alphabets(10);
  const createdConfig: IEcommerceSystemConfig =
    await generate_random_ecommerce_admin_system_configs_create(
      adminConnection,
      {
        body: {
          key: configKey,
          value: "initial_value",
          description: "initial description",
        } satisfies IEcommerceSystemConfig.ICreate,
      },
    );
  typia.assert(createdConfig);
  // 3. Update system config
  const updatedConfig: IEcommerceSystemConfig =
    await api.functional.ecommerce.admin.system_configs.update(
      adminConnection,
      {
        key: configKey,
        body: {
          value: "new_value",
          description: "updated description",
        } satisfies IEcommerceSystemConfig.IUpdate,
      },
    );
  typia.assert(updatedConfig);
  // 4. Validate
  TestValidator.predicate(
    "system status is operational",
    updatedConfig.systemStatus === "operational",
  );
  TestValidator.predicate("new orders > 0", updatedConfig.newOrdersToday > 0);
}
