import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfig";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Verify that configuration detail reflects the latest update.
 *
 * Business flow:
 *
 * 1. Join as a platform admin to obtain an authorized admin session.
 * 2. Create a new configuration entry using the admin context.
 * 3. Update the configuration's value and description via the update endpoint.
 * 4. Read the configuration detail by id.
 * 5. Assert that the detail response reflects the updated value/description and
 *    preserves non-modified fields as well as soft-delete status.
 */
export async function test_api_platform_admin_config_detail_reflects_updates(
  connection: api.IConnection,
) {
  // 1. Join as a platform admin
  const joinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a new configuration entry
  const createBody = {
    namespace: "payment",
    key: `payment_timeout_seconds_${RandomGenerator.alphaNumeric(6)}`,
    value: "30",
    description: "Initial payment timeout in seconds for checkout flows",
    active: true,
  } satisfies IShoppingMallConfig.ICreate;

  const createdConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.platformAdmin.configs.create(connection, {
      body: createBody,
    });
  typia.assert(createdConfig);

  // 3. Update configuration value and description
  const updateBody = {
    value: "45",
    description: "Updated payment timeout after operational tuning",
  } satisfies IShoppingMallConfig.IUpdate;

  const updatedConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.platformAdmin.configs.update(connection, {
      configId: createdConfig.id,
      body: updateBody,
    });
  typia.assert(updatedConfig);

  // 4. Read configuration detail by id
  const detailConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.platformAdmin.configs.at(connection, {
      configId: createdConfig.id,
    });
  typia.assert(detailConfig);

  // 5. Assertions ensuring detail reflects the latest persisted state

  // Identity consistency
  TestValidator.equals(
    "detail id matches created config id",
    detailConfig.id,
    createdConfig.id,
  );
  TestValidator.equals(
    "detail id matches updated config id",
    detailConfig.id,
    updatedConfig.id,
  );

  // Non-modified fields remain unchanged
  TestValidator.equals(
    "namespace remains unchanged",
    detailConfig.namespace,
    createdConfig.namespace,
  );
  TestValidator.equals(
    "key remains unchanged",
    detailConfig.key,
    createdConfig.key,
  );
  TestValidator.equals(
    "active flag remains unchanged",
    detailConfig.active,
    createdConfig.active,
  );

  // Updated fields reflect new values
  TestValidator.equals(
    "value reflects updated value",
    detailConfig.value,
    updateBody.value,
  );
  TestValidator.equals(
    "description reflects updated description",
    detailConfig.description,
    updateBody.description,
  );

  // Soft delete has not occurred
  TestValidator.equals(
    "deleted_at remains null or undefined",
    detailConfig.deleted_at ?? null,
    createdConfig.deleted_at ?? null,
  );

  // Temporal consistency: updated_at should not be earlier than original
  TestValidator.predicate("updated_at is not earlier than created_at", () => {
    const createdAt = new Date(createdConfig.created_at).getTime();
    const updatedAt = new Date(detailConfig.updated_at).getTime();
    return updatedAt >= createdAt;
  });

  TestValidator.predicate(
    "detailConfig.updated_at is not earlier than updatedConfig.updated_at",
    () => {
      const updatedAt = new Date(updatedConfig.updated_at).getTime();
      const detailUpdatedAt = new Date(detailConfig.updated_at).getTime();
      return detailUpdatedAt >= updatedAt;
    },
  );

  // Deep equality between updated and detail, allowing for identical objects
  TestValidator.equals(
    "detailConfig and updatedConfig are deeply equal",
    detailConfig,
    updatedConfig,
  );
}
