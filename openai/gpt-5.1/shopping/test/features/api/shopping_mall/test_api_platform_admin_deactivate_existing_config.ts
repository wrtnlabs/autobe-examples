import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfig";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate that a platform admin can deactivate an existing active
 * configuration without changing its identity fields or value.
 *
 * Business flow:
 *
 * 1. Register a platform admin via POST /auth/platformAdmin/join.
 * 2. As this admin, create an active config entry for
 *    reviews.auto_publish_threshold.
 * 3. Deactivate that config via PUT /shoppingMall/platformAdmin/configs/{configId}
 *    by setting active=false and updating description.
 * 4. Verify that id, namespace, key, value, and created_at are unchanged, while
 *    active is false, description is updated, and updated_at has advanced.
 */
export async function test_api_platform_admin_deactivate_existing_config(
  connection: api.IConnection,
) {
  // 1. Register a platform admin and obtain authorized session (SDK sets token)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create an active configuration entry for reviews.auto_publish_threshold
  const initialDescription: string = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });

  const createBody = {
    namespace: "reviews",
    key: "auto_publish_threshold",
    value: "0.9",
    description: initialDescription,
    active: true,
  } satisfies IShoppingMallConfig.ICreate;

  const created: IShoppingMallConfig =
    await api.functional.shoppingMall.platformAdmin.configs.create(connection, {
      body: createBody,
    });
  typia.assert(created);

  // Capture original state for comparison
  const originalId = created.id;
  const originalNamespace = created.namespace;
  const originalKey = created.key;
  const originalValue = created.value;
  const originalDescription = created.description ?? null;
  const originalActive = created.active;
  const originalCreatedAt = created.created_at;
  const originalUpdatedAt = created.updated_at;

  TestValidator.predicate(
    "config should start as active",
    originalActive === true,
  );

  // 3. Deactivate the configuration and update description via PUT update
  const deactivatedDescription: string = `${originalDescription ?? ""} [deactivated]`;

  const updateBody = {
    description: deactivatedDescription,
    active: false,
  } satisfies IShoppingMallConfig.IUpdate;

  const updated: IShoppingMallConfig =
    await api.functional.shoppingMall.platformAdmin.configs.update(connection, {
      configId: originalId,
      body: updateBody,
    });
  typia.assert(updated);

  // 4. Validate invariants and state transitions
  TestValidator.equals(
    "config id must remain unchanged after deactivation",
    updated.id,
    originalId,
  );

  TestValidator.equals(
    "namespace should remain unchanged after deactivation",
    updated.namespace,
    originalNamespace,
  );

  TestValidator.equals(
    "key should remain unchanged after deactivation",
    updated.key,
    originalKey,
  );

  TestValidator.equals(
    "value should remain unchanged when only toggling active flag",
    updated.value,
    originalValue,
  );

  TestValidator.equals(
    "active flag must be set to false after deactivation",
    updated.active,
    false,
  );

  TestValidator.equals(
    "description should reflect deactivation note",
    updated.description ?? null,
    deactivatedDescription,
  );

  TestValidator.equals(
    "created_at must remain unchanged after update",
    updated.created_at,
    originalCreatedAt,
  );

  TestValidator.notEquals(
    "updated_at must change after configuration update",
    updated.updated_at,
    originalUpdatedAt,
  );
}
