import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";

export async function test_api_shopping_mall_configuration_retrieval_by_id(
  connection: api.IConnection,
) {
  // 1. Create a new shopping mall configuration with realistic values
  const createBody = {
    key: `test_key_${RandomGenerator.alphaNumeric(6)}`,
    value: `test_value_${RandomGenerator.alphaNumeric(10)}`,
    category: RandomGenerator.pick(["general", "payment", null]),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    enabled: true,
  } satisfies IShoppingMallConfiguration.ICreate;

  const createdConfig =
    await api.functional.shoppingMall.shoppingMall.configurations.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdConfig);

  // 2. Retrieve the created configuration by ID
  const fetchedConfig =
    await api.functional.shoppingMall.shoppingMall.configurations.at(
      connection,
      {
        configurationId: createdConfig.id,
      },
    );
  typia.assert(fetchedConfig);

  // 3. Assert that all fields match between created and fetched configuration
  TestValidator.equals(
    "Configuration id matches",
    fetchedConfig.id,
    createdConfig.id,
  );
  TestValidator.equals(
    "Configuration key matches",
    fetchedConfig.key,
    createdConfig.key,
  );
  TestValidator.equals(
    "Configuration value matches",
    fetchedConfig.value,
    createdConfig.value,
  );
  TestValidator.equals(
    "Configuration category matches",
    fetchedConfig.category,
    createdConfig.category,
  );
  TestValidator.equals(
    "Configuration description matches",
    fetchedConfig.description,
    createdConfig.description,
  );
  TestValidator.equals(
    "Configuration enabled matches",
    fetchedConfig.enabled,
    createdConfig.enabled,
  );
  TestValidator.equals(
    "Configuration created_at matches",
    fetchedConfig.created_at,
    createdConfig.created_at,
  );
  TestValidator.equals(
    "Configuration updated_at matches",
    fetchedConfig.updated_at,
    createdConfig.updated_at,
  );

  // 4. Test error handling: Retrieve configuration with an invalid ID
  await TestValidator.error(
    "Retrieving non-existent configuration should error",
    async () => {
      await api.functional.shoppingMall.shoppingMall.configurations.at(
        connection,
        {
          configurationId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
