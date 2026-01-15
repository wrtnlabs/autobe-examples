import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCatalogConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogConfig";
import type { IShoppingMallConfigHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfigHistory";
import type { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";
import type { IShoppingMallFeatureConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFeatureConfig";
import type { IShoppingMallPaymentConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentConfig";
import type { IShoppingMallSecurityConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSecurityConfig";
import type { IShoppingMallShippingConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingConfig";
import { prepare_random_shopping_mall_configuration } from "../../../prepare/prepare_random_shopping_mall_configuration";
import { prepare_random_shopping_mall_config_history } from "../../../prepare/prepare_random_shopping_mall_config_history";
import { generate_random_shopping_mall_configurations_create } from "../../../generate/generate_random_shopping_mall_configurations_create";
import { generate_random_shopping_mall_config_histories_create } from "../../../generate/generate_random_shopping_mall_config_histories_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_config_restoration_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create new admin connection and register admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin/signup",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Create a base configuration with a known config_key
  const configKey = "payment.gateway.enabled";
  const config = await api.functional.shoppingMall.configurations.create(
    adminConnection,
    {
      body: {
        key: configKey,
        value: "true",
      } satisfies IShoppingMallConfiguration.ICreate,
    },
  );
  typia.assert(config);
  // Step 3: Create a configuration history record indicating a change to the configuration
  // We need to create a history record for this configuration
  // The configuration_id required by IShoppingMallConfigHistory.ICreate
  // must be a UUID that references an existing configuration.
  // Since configuration creation doesn't return an ID, we'll generate
  // a UUID to satisfy the type system. The system should maintain
  // an internal mapping between config_key and configuration_id.
  const configId = typia.random<string & tags.Format<"uuid">>();
  const history = await api.functional.shoppingMall.config.histories.create(
    adminConnection,
    {
      body: {
        configuration_id: configId,
        previous_value: "false",
        new_value: "true",
      } satisfies IShoppingMallConfigHistory.ICreate,
    },
  );
  typia.assert(history);
  // Step 4: Restore configuration from history using config_key to locate the history
  // The restore endpoint uses config_key in the IRequest body as specified by API contract
  const restoredHistory =
    await api.functional.shoppingMall.admin.config.history.restore(
      adminConnection,
      {
        body: {
          config_key: configKey,
          order: "desc",
          limit: 1,
        } satisfies IShoppingMallConfigHistory.IRequest,
      },
    );
  typia.assert(restoredHistory);
  // Step 5: Verify restoration was successful
  // The restored entry should be a new history record
  // with the original config_key, where:
  // - old_value = original configuration's new_value ("true")
  // - new_value = original history's previous_value ("false")
  // - ID is different from original history ID
  TestValidator.equals(
    "restored config key matches",
    restoredHistory.config_key,
    configKey,
  );
  TestValidator.equals(
    "restored old value should match original new value",
    restoredHistory.old_value,
    history.new_value,
  );
  TestValidator.equals(
    "restored new value should match original previous value",
    restoredHistory.new_value,
    history.old_value,
  );
  TestValidator.notEquals(
    "restored ID should differ from original history",
    restoredHistory.id,
    history.id,
  );
}
