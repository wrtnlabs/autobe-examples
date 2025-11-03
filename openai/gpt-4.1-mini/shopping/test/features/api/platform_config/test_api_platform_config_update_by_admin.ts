import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPlatformConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformConfig";

export async function test_api_platform_config_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin join authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "securepassword123",
        full_name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create a platform config entry
  const createRequest = {
    config_name: `example_config_${RandomGenerator.alphaNumeric(8)}`,
    config_value: "initial_value",
    description: "Initial platform config for testing",
  } satisfies IShoppingMallPlatformConfig.ICreate;

  const createdConfig: IShoppingMallPlatformConfig =
    await api.functional.shoppingMall.admin.platformConfigs.create(connection, {
      body: createRequest,
    });
  typia.assert(createdConfig);

  TestValidator.equals(
    "created config_name matches",
    createdConfig.config_name,
    createRequest.config_name,
  );
  TestValidator.equals(
    "created config_value matches",
    createdConfig.config_value,
    createRequest.config_value,
  );

  // 3. Update the platform config entry
  const updateRequest = {
    config_name: `updated_config_${RandomGenerator.alphaNumeric(8)}`,
    config_value: "updated_value",
    description: "Updated description",
    created_at: createdConfig.created_at,
    updated_at: createdConfig.updated_at,
    deleted_at: null,
    id: createdConfig.id,
  } satisfies IShoppingMallPlatformConfig.IUpdate;

  const updatedConfig: IShoppingMallPlatformConfig =
    await api.functional.shoppingMall.admin.platformConfigs.update(connection, {
      id: createdConfig.id,
      body: updateRequest,
    });
  typia.assert(updatedConfig);

  TestValidator.equals(
    "updated config id matches",
    updatedConfig.id,
    createdConfig.id,
  );
  TestValidator.equals(
    "updated config_name matches",
    updatedConfig.config_name,
    updateRequest.config_name,
  );
  TestValidator.equals(
    "updated config_value matches",
    updatedConfig.config_value,
    updateRequest.config_value,
  );
  TestValidator.equals(
    "updated description matches",
    updatedConfig.description,
    updateRequest.description,
  );

  // 4. Attempt to update with duplicate config_name should throw error
  // Because no other config exists, we create another to test duplicate.
  const anotherCreateRequest = {
    config_name: `duplicate_config_${RandomGenerator.alphaNumeric(8)}`,
    config_value: "some_value",
    description: "Another config",
  } satisfies IShoppingMallPlatformConfig.ICreate;

  const anotherConfig: IShoppingMallPlatformConfig =
    await api.functional.shoppingMall.admin.platformConfigs.create(connection, {
      body: anotherCreateRequest,
    });
  typia.assert(anotherConfig);

  // Try to update anotherConfig's config_name to updateRequest.config_name (should error)
  await TestValidator.error(
    "updating to duplicate config_name should fail",
    async () => {
      await api.functional.shoppingMall.admin.platformConfigs.update(
        connection,
        {
          id: anotherConfig.id,
          body: {
            config_name: updateRequest.config_name,
            config_value: "conflict value",
            description: null,
            created_at: anotherConfig.created_at,
            updated_at: anotherConfig.updated_at,
            deleted_at: null,
            id: anotherConfig.id,
          } satisfies IShoppingMallPlatformConfig.IUpdate,
        },
      );
    },
  );
}
