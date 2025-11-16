import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemConfig";

/**
 * Verify that system configuration detail retrieval reflects the latest
 * updates.
 *
 * Business goal: Ensure that GET
 * /communityPlatform/adminUser/systemConfigs/{systemConfigId} always returns
 * the most recently persisted state of a system configuration entry after it
 * has been created and subsequently updated by an adminUser.
 *
 * Scenario steps:
 *
 * 1. Register a new adminUser via the join endpoint and rely on SDK to attach the
 *    Authorization header for authenticated admin operations.
 * 2. As that admin, create a configuration via the systemConfigs.create endpoint
 *    with initial values (e.g., category "ui", config_key "ui_theme_default",
 *    value "light", description, is_active=true).
 * 3. Store the created configuration’s id and its initial updated_at timestamp.
 * 4. Issue an update via systemConfigs.update on the same id, changing value
 *    (e.g., to "dark"), description, and toggling is_active.
 * 5. Retrieve the configuration via systemConfigs.at with the same id.
 * 6. Assert that:
 *
 *    - Id remains unchanged
 *    - Category and config_key are the same as in the creation step
 *    - Value, description, and is_active equal the latest updated values
 *    - Updated_at is strictly later than the original updated_at, demonstrating that
 *         the update was persisted and surfaced by GET.
 */
export async function test_api_system_config_retrieve_reflects_updates(
  connection: api.IConnection,
) {
  // 1. Register adminUser, SDK will set Authorization header automatically
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create initial system configuration
  const createBody = {
    category: "ui",
    config_key: "ui_theme_default" as string & tags.MinLength<1>,
    value: "light" as string & tags.MinLength<1>,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_active: true,
  } satisfies ICommunityPlatformSystemConfig.ICreate;

  const createdConfig: ICommunityPlatformSystemConfig =
    await api.functional.communityPlatform.adminUser.systemConfigs.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdConfig);

  const originalId: string & tags.Format<"uuid"> = createdConfig.id;
  const originalCategory: string | null | undefined = createdConfig.category;
  const originalConfigKey: string & tags.MinLength<1> =
    createdConfig.config_key;
  const originalUpdatedAt: string & tags.Format<"date-time"> =
    createdConfig.updated_at;

  // 3. Prepare update payload - change value, description, and is_active
  const updatedValue: string & tags.MinLength<1> = "dark" as string &
    tags.MinLength<1>;
  const updatedDescription: string = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 3,
    wordMax: 8,
  });
  const updatedIsActive = !createdConfig.is_active;

  const updateBody = {
    value: updatedValue,
    description: updatedDescription,
    is_active: updatedIsActive,
  } satisfies ICommunityPlatformSystemConfig.IUpdate;

  const updatedConfig: ICommunityPlatformSystemConfig =
    await api.functional.communityPlatform.adminUser.systemConfigs.update(
      connection,
      {
        systemConfigId: originalId,
        body: updateBody,
      },
    );
  typia.assert(updatedConfig);

  // Ensure updated response already reflects the changes
  TestValidator.equals(
    "updated config id remains the same",
    updatedConfig.id,
    originalId,
  );
  TestValidator.equals(
    "updated config category unchanged",
    updatedConfig.category ?? null,
    (originalCategory ?? null) as string | null,
  );
  TestValidator.equals(
    "updated config_key unchanged",
    updatedConfig.config_key,
    originalConfigKey,
  );
  TestValidator.equals(
    "updated value matches request",
    updatedConfig.value,
    updatedValue,
  );
  TestValidator.equals(
    "updated description matches request",
    updatedConfig.description ?? null,
    updatedDescription,
  );
  TestValidator.equals(
    "updated is_active matches request",
    updatedConfig.is_active,
    updatedIsActive,
  );

  // 4. Retrieve the configuration via detail endpoint
  const fetchedConfig: ICommunityPlatformSystemConfig =
    await api.functional.communityPlatform.adminUser.systemConfigs.at(
      connection,
      {
        systemConfigId: originalId,
      },
    );
  typia.assert(fetchedConfig);

  // 5. Business assertions on fetched configuration
  TestValidator.equals(
    "fetched id matches original",
    fetchedConfig.id,
    originalId,
  );
  TestValidator.equals(
    "fetched category matches original",
    fetchedConfig.category ?? null,
    (originalCategory ?? null) as string | null,
  );
  TestValidator.equals(
    "fetched config_key matches original",
    fetchedConfig.config_key,
    originalConfigKey,
  );
  TestValidator.equals(
    "fetched value reflects latest update",
    fetchedConfig.value,
    updatedValue,
  );
  TestValidator.equals(
    "fetched description reflects latest update",
    fetchedConfig.description ?? null,
    updatedDescription,
  );
  TestValidator.equals(
    "fetched is_active reflects latest update",
    fetchedConfig.is_active,
    updatedIsActive,
  );

  // Compare updated_at to ensure it advanced after update
  const originalTime = new Date(originalUpdatedAt).getTime();
  const fetchedTime = new Date(fetchedConfig.updated_at).getTime();

  TestValidator.predicate(
    "updated_at after update is later than original updated_at",
    fetchedTime > originalTime,
  );
}
