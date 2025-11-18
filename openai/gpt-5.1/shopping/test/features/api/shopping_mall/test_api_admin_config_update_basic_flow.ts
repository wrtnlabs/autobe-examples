import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfig";

/**
 * Validate that an authenticated admin can update an existing global
 * configuration entry.
 *
 * Business flow:
 *
 * 1. Admin joins via /auth/admin/join and obtains JWT (handled by SDK).
 * 2. Admin creates a new configuration via /shoppingMall/admin/configs (ICreate).
 * 3. Admin updates the configuration via /shoppingMall/admin/configs/{configId}
 *    (IUpdate), changing description, value_json, and toggling is_active.
 * 4. Validate that the returned configuration reflects updated mutable fields
 *    while preserving immutable identifiers and creation timestamp, and that
 *    updated_at changes.
 */
export async function test_api_admin_config_update_basic_flow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin join (registration + implicit authentication)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create baseline configuration
  const initialConfigBody = {
    namespace: "checkout",
    config_key: "maxCartItems",
    environment: "staging",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    value_json: JSON.stringify({ maxItems: 10, featureFlag: true }),
    is_active: true,
  } satisfies IShoppingMallConfig.ICreate;

  const originalConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.admin.configs.create(connection, {
      body: initialConfigBody,
    });
  typia.assert(originalConfig);

  // 3. Prepare update payload - change description, value_json, toggle is_active
  const newDescription: string = RandomGenerator.paragraph({ sentences: 3 });
  const newValueJson: string = JSON.stringify({
    maxItems: 20,
    featureFlag: false,
  });
  const toggledIsActive: boolean = !originalConfig.is_active;

  const updateBody = {
    description: newDescription,
    value_json: newValueJson,
    is_active: toggledIsActive,
  } satisfies IShoppingMallConfig.IUpdate;

  // 4. Update configuration via PUT /shoppingMall/admin/configs/{configId}
  const updatedConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.admin.configs.update(connection, {
      configId: originalConfig.id,
      body: updateBody,
    });
  typia.assert(updatedConfig);

  // 5. Validate immutable and mutable fields
  // ID should remain the same
  TestValidator.equals(
    "config id should be preserved after update",
    updatedConfig.id,
    originalConfig.id,
  );

  // Namespace, config_key, environment should remain unchanged (we did not update them)
  TestValidator.equals(
    "namespace should remain unchanged",
    updatedConfig.namespace,
    originalConfig.namespace,
  );
  TestValidator.equals(
    "config_key should remain unchanged",
    updatedConfig.config_key,
    originalConfig.config_key,
  );
  TestValidator.equals(
    "environment should remain unchanged",
    updatedConfig.environment,
    originalConfig.environment,
  );

  // Description, value_json, is_active should reflect new values
  TestValidator.equals(
    "description should be updated",
    updatedConfig.description,
    newDescription,
  );
  TestValidator.equals(
    "value_json should be updated",
    updatedConfig.value_json,
    newValueJson,
  );
  TestValidator.equals(
    "is_active should be toggled",
    updatedConfig.is_active,
    toggledIsActive,
  );

  // created_at should stay the same
  TestValidator.equals(
    "created_at should remain unchanged",
    updatedConfig.created_at,
    originalConfig.created_at,
  );

  // updated_at should change (ideally be later, but we can at least assert inequality)
  TestValidator.notEquals(
    "updated_at should change after update",
    updatedConfig.updated_at,
    originalConfig.updated_at,
  );
}
