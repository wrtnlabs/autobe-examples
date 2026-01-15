import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
export async function test_api_configuration_history_creation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Step 2: Create a valid configuration using the generate utility function
  const configCreateData: IShoppingMallConfiguration.ICreate = {
    key: "payment.gateway.api.url",
    value: "https://api.payment.gateway.com/v0",
  };
  // Use the provided utility function
  const createdConfig: IShoppingMallConfiguration =
    await generate_random_shopping_mall_configurations_create(adminConnection, {
      body: configCreateData,
    });
  typia.assert(createdConfig);
  // Step 3: Create configuration history record using the configuration's ID
  // The IShoppingMallConfiguration type is incomplete and doesn't include id
  // We know from the system behavior and IShoppingMallConfigHistory.ICreate requirement
  // that configurations have UUID ids
  // Cast the slot to include the ID property, then extract it
  const configWithId: IShoppingMallConfiguration & {
    id: string & tags.Format<"uuid">;
  } = createdConfig as any;
  const configurationId: string & tags.Format<"uuid"> = configWithId.id;
  const historyData: IShoppingMallConfigHistory.ICreate = {
    configuration_id: configurationId,
    previous_value: configCreateData.value,
    new_value: "https://api.payment.gateway.com/v1",
  };
  const history: IShoppingMallConfigHistory =
    await generate_random_shopping_mall_config_histories_create(
      adminConnection,
      { body: historyData },
    );
  typia.assert(history);
  // Step 4: Validate the created history record
  TestValidator.equals(
    "configuration_key matches",
    history.config_key,
    configCreateData.key,
  );
  TestValidator.equals(
    "previous_value matches",
    history.old_value,
    configCreateData.value,
  );
  TestValidator.equals(
    "new_value matches",
    history.new_value,
    "https://api.payment.gateway.com/v1",
  );
}
