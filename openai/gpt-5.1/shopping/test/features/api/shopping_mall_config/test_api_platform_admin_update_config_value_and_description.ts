import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfig";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate that a platform admin can update mutable configuration fields
 * (value, description, active) while preserving identity and audit metadata on
 * an existing shopping mall global configuration entry.
 *
 * Business flow:
 *
 * 1. Register a new platform admin via POST /auth/platformAdmin/join to obtain an
 *    authorized session bound to the provided connection.
 * 2. As that admin, create an initial configuration entry via POST
 *    /shoppingMall/platformAdmin/configs with a deterministic namespace/key and
 *    baseline values.
 * 3. Update the configuration using PUT
 *    /shoppingMall/platformAdmin/configs/{configId} to change value,
 *    description, and active flag.
 * 4. Verify business invariants (id, namespace, key) and that mutable fields
 *    reflect the update payload.
 * 5. Verify audit semantics: created_at is stable, updated_at advances, and
 *    deleted_at remains null.
 */
export async function test_api_platform_admin_update_config_value_and_description(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin (auth join)
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinRequest,
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create an initial configuration entry
  const createBody = {
    namespace: "checkout",
    key: "max_cart_items",
    value: "100",
    description: "Initial maximum cart size",
    active: true,
  } satisfies IShoppingMallConfig.ICreate;

  const originalConfig =
    await api.functional.shoppingMall.platformAdmin.configs.create(connection, {
      body: createBody,
    });
  typia.assert<IShoppingMallConfig>(originalConfig);

  // Basic sanity checks on created config
  TestValidator.predicate("created config id format is uuid", () => {
    // typia.assert already validates format, but predicate ensures non-empty
    return (originalConfig.id as string).length > 0;
  });
  TestValidator.equals(
    "created namespace must match input",
    originalConfig.namespace,
    createBody.namespace,
  );
  TestValidator.equals(
    "created key must match input",
    originalConfig.key,
    createBody.key,
  );
  TestValidator.equals(
    "created value must match input",
    originalConfig.value,
    createBody.value,
  );
  TestValidator.equals(
    "created active must match input",
    originalConfig.active,
    createBody.active,
  );

  const originalCreatedAt = new Date(originalConfig.created_at);
  const originalUpdatedAt = new Date(originalConfig.updated_at);
  const originalDeletedAt = originalConfig.deleted_at ?? null;

  TestValidator.predicate(
    "created_at should be a valid date",
    !Number.isNaN(originalCreatedAt.getTime()),
  );
  TestValidator.predicate(
    "updated_at should be a valid date",
    !Number.isNaN(originalUpdatedAt.getTime()),
  );
  TestValidator.predicate(
    "created_at should be <= updated_at on creation",
    originalCreatedAt.getTime() <= originalUpdatedAt.getTime(),
  );
  TestValidator.equals(
    "deleted_at must be null/undefined on creation",
    originalDeletedAt,
    null,
  );

  // 3. Update configuration: change value, description, and active flag
  const updatedValue = "150";
  const updatedDescription = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 3,
    wordMax: 8,
  });

  const updateBody = {
    value: updatedValue,
    description: updatedDescription,
    active: false,
  } satisfies IShoppingMallConfig.IUpdate;

  const updatedConfig =
    await api.functional.shoppingMall.platformAdmin.configs.update(connection, {
      configId: originalConfig.id,
      body: updateBody,
    });
  typia.assert<IShoppingMallConfig>(updatedConfig);

  // 4. Business invariants and mutable field validation
  TestValidator.equals(
    "config id should remain unchanged after update",
    updatedConfig.id,
    originalConfig.id,
  );
  TestValidator.equals(
    "namespace should remain unchanged after update",
    updatedConfig.namespace,
    originalConfig.namespace,
  );
  TestValidator.equals(
    "key should remain unchanged after update",
    updatedConfig.key,
    originalConfig.key,
  );
  TestValidator.equals(
    "value should match updated value",
    updatedConfig.value,
    updatedValue,
  );
  TestValidator.equals(
    "description should match updated description",
    updatedConfig.description,
    updatedDescription,
  );
  TestValidator.equals(
    "active flag should match updated state",
    updatedConfig.active,
    updateBody.active,
  );

  // 5. Audit semantics
  const newCreatedAt = new Date(updatedConfig.created_at);
  const newUpdatedAt = new Date(updatedConfig.updated_at);
  const newDeletedAt = updatedConfig.deleted_at ?? null;

  TestValidator.predicate(
    "created_at must remain identical after update",
    newCreatedAt.getTime() === originalCreatedAt.getTime(),
  );
  TestValidator.predicate(
    "updated_at must change after update",
    newUpdatedAt.getTime() !== originalUpdatedAt.getTime(),
  );
  TestValidator.predicate(
    "updated_at must not be earlier than created_at",
    newUpdatedAt.getTime() >= newCreatedAt.getTime(),
  );
  TestValidator.equals(
    "deleted_at must still be null after update",
    newDeletedAt,
    null,
  );
}
