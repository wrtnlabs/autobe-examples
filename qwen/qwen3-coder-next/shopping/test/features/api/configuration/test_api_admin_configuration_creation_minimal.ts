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

export async function test_api_admin_configuration_creation_minimal(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234!@#$" satisfies string & tags.Format<"password">,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Generate unique config key for this test
  const configKey = `test_config_${RandomGenerator.alphaNumeric(8)}`;
  // Create minimal configuration with only required fields
  const config = await api.functional.shoppingMall.admin.configurations.create(
    adminConnection,
    {
      body: {
        config_key: configKey,
        is_enabled: true,
      } satisfies IShoppingMallSystemConfiguration.ICreate,
    },
  );
  typia.assert(config);
  // Verify configuration was created successfully
  TestValidator.equals("config created", (config as any).config_key, configKey);
  TestValidator.equals("is_enabled set", (config as any).is_enabled, true);
  // Verify optional fields have appropriate defaults
  TestValidator.equals("category is null", (config as any).category, null);
  TestValidator.equals("description is null", (config as any).description, null);
  // Verify updated_by is populated from admin token
  TestValidator.predicate(
    "updated_by is valid uuid",
    (config as any).updated_by !== null && (config as any).updated_by !== undefined,
  );
}