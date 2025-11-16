import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";

export async function test_api_shopping_mall_configuration_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user registers to obtain authorization tokens
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    phone_number: null,
    role: "superadmin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // 2. Admin creates a new shopping mall configuration
  const configCreateBody = {
    key: `config_${RandomGenerator.alphaNumeric(6)}`,
    value: RandomGenerator.alphaNumeric(20),
    description: "Test configuration description",
    enabled: true,
    _adminNote: "Automated test configuration",
  } satisfies IShoppingMallConfiguration.ICreate;

  const configuration: IShoppingMallConfiguration =
    await api.functional.shoppingMall.admin.shoppingMallConfigurations.create(
      connection,
      { body: configCreateBody },
    );
  typia.assert(configuration);

  TestValidator.equals(
    "Created config key matches request",
    configuration.key,
    configCreateBody.key,
  );

  // 3. Admin updates the configuration value
  const updatedValue = RandomGenerator.alphaNumeric(25);
  const updateBody = {
    value: updatedValue,
  } satisfies IShoppingMallConfiguration.IUpdate;

  const updatedConfiguration: IShoppingMallConfiguration =
    await api.functional.shoppingMall.admin.shoppingMallConfigurations.update(
      connection,
      {
        key: configuration.key,
        body: updateBody,
      },
    );
  typia.assert(updatedConfiguration);

  // 4. Validate the updated value is persisted
  TestValidator.equals(
    "Updated configuration value matches",
    updatedConfiguration.value,
    updatedValue,
  );
}
