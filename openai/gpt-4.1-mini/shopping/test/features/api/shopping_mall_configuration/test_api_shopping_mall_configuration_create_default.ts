import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";

export async function test_api_shopping_mall_configuration_create_default(
  connection: api.IConnection,
) {
  // Generate a realistic configuration create request
  const key = `maxOrderQuantity${RandomGenerator.alphaNumeric(4)}`;
  const value = "100";
  const category = "order";
  const description = "Maximum number of items per order";

  // Test creation with all fields
  const requestBodyAllFields = {
    key,
    value,
    category,
    description,
    enabled: true,
  } satisfies IShoppingMallConfiguration.ICreate;

  const configurationAll =
    await api.functional.shoppingMall.shoppingMall.configurations.create(
      connection,
      {
        body: requestBodyAllFields,
      },
    );
  typia.assert(configurationAll);
  TestValidator.predicate(
    "configuration ID is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      configurationAll.id,
    ),
  );
  TestValidator.equals(
    "configuration key matches",
    configurationAll.key,
    requestBodyAllFields.key,
  );
  TestValidator.equals(
    "configuration value matches",
    configurationAll.value,
    requestBodyAllFields.value,
  );
  TestValidator.equals(
    "configuration category matches",
    configurationAll.category,
    requestBodyAllFields.category,
  );
  TestValidator.equals(
    "configuration description matches",
    configurationAll.description,
    requestBodyAllFields.description,
  );
  TestValidator.equals(
    "configuration is enabled",
    configurationAll.enabled,
    true,
  );
  TestValidator.predicate(
    "created_at and updated_at are ISO strings",
    /^\\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      configurationAll.created_at,
    ) &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
        configurationAll.updated_at,
      ),
  );
  TestValidator.equals(
    "deleted_at is null or undefined",
    configurationAll.deleted_at ?? null,
    null,
  );

  // Test creation with null category and description
  const requestBodyNullOptional = {
    key: `minOrderQuantity${RandomGenerator.alphaNumeric(4)}`,
    value: "1",
    category: null,
    description: null,
    enabled: false,
  } satisfies IShoppingMallConfiguration.ICreate;

  const configurationNullOptional =
    await api.functional.shoppingMall.shoppingMall.configurations.create(
      connection,
      {
        body: requestBodyNullOptional,
      },
    );
  typia.assert(configurationNullOptional);
  TestValidator.predicate(
    "configuration ID is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      configurationNullOptional.id,
    ),
  );
  TestValidator.equals(
    "configuration key matches",
    configurationNullOptional.key,
    requestBodyNullOptional.key,
  );
  TestValidator.equals(
    "configuration value matches",
    configurationNullOptional.value,
    requestBodyNullOptional.value,
  );
  TestValidator.equals(
    "configuration category is null",
    configurationNullOptional.category,
    null,
  );
  TestValidator.equals(
    "configuration description is null",
    configurationNullOptional.description,
    null,
  );
  TestValidator.equals(
    "configuration is not enabled",
    configurationNullOptional.enabled,
    false,
  );
  TestValidator.predicate(
    "created_at and updated_at are ISO strings",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      configurationNullOptional.created_at,
    ) &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
        configurationNullOptional.updated_at,
      ),
  );
  TestValidator.equals(
    "deleted_at is null or undefined",
    configurationNullOptional.deleted_at ?? null,
    null,
  );
}
