import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfiguration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_shopping_mall_admin_configurations_create } from "../../../generate/generate_random_shopping_mall_admin_configurations_create";
import { prepare_random_shopping_mall_system_configuration } from "../../../prepare/prepare_random_shopping_mall_system_configuration";

export async function test_api_admin_configuration_creation_complete(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await api.functional.shoppingMall.auth.admin.join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "Admin123!" + RandomGenerator.alphaNumeric(8),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Create configuration using utility function
  const config =
    await generate_random_shopping_mall_admin_configurations_create(
      adminConnection,
      {
        body: {
          config_key: "test_config_" + RandomGenerator.alphaNumeric(8),
          category: "test_category",
          is_enabled: true,
          description:
            "This is a test configuration for complete creation testing",
        } satisfies IShoppingMallSystemConfiguration.ICreate,
      },
    );
  typia.assert(config);
  // Verify configuration fields from IShoppingMallSystemConfiguration
  TestValidator.equals("has valid date", config.date !== undefined, true);
  TestValidator.equals(
    "has valid total_sales_amount",
    typeof config.total_sales_amount === "number",
    true,
  );
  TestValidator.equals(
    "has valid order_count",
    typeof config.order_count === "number",
    true,
  );
}
