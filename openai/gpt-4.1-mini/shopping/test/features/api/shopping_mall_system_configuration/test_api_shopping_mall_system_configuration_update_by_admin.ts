import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfiguration";

export async function test_api_shopping_mall_system_configuration_update_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Admin authentication via join to obtain authorization token
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "SafePassword123!",
        href: "https://admin.example.com/join",
        referrer: "https://admin.example.com",
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // Step 2: Create a new system configuration
  const originalConfigCreateBody = {
    key: `config_key_${RandomGenerator.alphaNumeric(8)}`,
    value: "InitialValue",
    description: "Initial configuration description for testing",
  } satisfies IShoppingMallSystemConfiguration.ICreate;

  const systemConfig: IShoppingMallSystemConfiguration =
    await api.functional.shoppingMall.admin.shoppingMallSystemConfigurations.create(
      connection,
      {
        body: originalConfigCreateBody,
      },
    );
  typia.assert(systemConfig);

  // Step 3: Update the system configuration with new values
  const updatedValue = "UpdatedValue" + RandomGenerator.alphaNumeric(5);
  const updatedDescription = systemConfig.description + ". Modified by test.";

  const updateBody: IShoppingMallSystemConfiguration.IUpdate = {
    value: updatedValue,
    description: updatedDescription,
  };

  const updatedConfig: IShoppingMallSystemConfiguration =
    await api.functional.shoppingMall.admin.shoppingMallSystemConfigurations.update(
      connection,
      {
        shoppingMallSystemConfigurationId: systemConfig.id,
        body: updateBody,
      },
    );
  typia.assert(updatedConfig);

  // Step 4: Validate updated configuration
  TestValidator.equals(
    "Configuration id remains the same after update",
    updatedConfig.id,
    systemConfig.id,
  );
  TestValidator.equals(
    "Configuration key remains the same after update",
    updatedConfig.key,
    systemConfig.key,
  );
  TestValidator.equals(
    "Configuration value is updated",
    updatedConfig.value,
    updatedValue,
  );
  TestValidator.equals(
    "Configuration description is updated",
    updatedConfig.description,
    updatedDescription,
  );

  const updatedAtTime = new Date(updatedConfig.updated_at).getTime();
  const createdAtTime = new Date(systemConfig.created_at).getTime();
  TestValidator.predicate(
    "updated_at timestamp is refreshed to be newer than created_at",
    updatedAtTime > createdAtTime,
  );
}
