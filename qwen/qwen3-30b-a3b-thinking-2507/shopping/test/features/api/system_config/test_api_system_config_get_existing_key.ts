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

export async function test_api_system_config_get_existing_key(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IEcommerceAdmin.IJoin,
  });
  // 2. Create system config with key 'example_key'
  const createdConfig =
    await generate_random_ecommerce_admin_system_configs_create(
      adminConnection,
      {
        body: {
          key: "example_key",
          value: RandomGenerator.paragraph(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceSystemConfig.ICreate,
      },
    );
  typia.assert(createdConfig);
  // 3. Retrieve the configuration
  const retrievedConfig =
    await api.functional.ecommerce.admin.system_configs.at(adminConnection, {
      key: "example_key",
    });
  typia.assert(retrievedConfig);
  // 4. Verify all fields
  TestValidator.equals(
    "systemStatus matches",
    retrievedConfig.systemStatus,
    "operational",
  );
  TestValidator.equals(
    "newOrdersToday is a number",
    typeof retrievedConfig.newOrdersToday === "number",
    true,
  );
  TestValidator.equals(
    "revenueToday is a number",
    typeof retrievedConfig.revenueToday === "number",
    true,
  );
  TestValidator.equals(
    "activeSellers is a number",
    typeof retrievedConfig.activeSellers === "number",
    true,
  );
  TestValidator.equals(
    "systemUptime is a number",
    typeof retrievedConfig.systemUptime === "number",
    true,
  );
  TestValidator.equals(
    "pendingCancellations is a number",
    typeof retrievedConfig.pendingCancellations === "number",
    true,
  );
}
