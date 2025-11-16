import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemConfig";

export async function test_api_system_config_update_toggle_active_flag(
  connection: api.IConnection,
) {
  // 1. Register an adminUser (join) to obtain authorized context
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create an active system configuration entry
  const createBody = {
    category: "feature_flag",
    config_key: "new_moderation_ui",
    value: "true",
    description: "Enables the new moderation UI",
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

  // Basic invariants on creation
  TestValidator.equals(
    "created config category should match request",
    createdConfig.category,
    createBody.category ?? null,
  );
  TestValidator.equals(
    "created config key should match request",
    createdConfig.config_key,
    createBody.config_key,
  );
  TestValidator.equals(
    "created config value should match request",
    createdConfig.value,
    createBody.value,
  );
  TestValidator.equals(
    "created config description should match request",
    createdConfig.description ?? null,
    createBody.description ?? null,
  );
  TestValidator.equals(
    "created config is_active should be true",
    createdConfig.is_active,
    true,
  );

  // Ensure soft-delete lifecycle not affected on creation
  TestValidator.equals(
    "created config deleted_at should be null or undefined",
    createdConfig.deleted_at ?? null,
    null,
  );

  const originalId = createdConfig.id;
  const originalCategory = createdConfig.category ?? null;
  const originalConfigKey = createdConfig.config_key;
  const originalValue = createdConfig.value;
  const originalDescription = createdConfig.description ?? null;
  const originalCreatedAt = createdConfig.created_at;
  const originalUpdatedAt = createdConfig.updated_at;

  // 3. Toggle is_active from true to false via update
  const firstUpdateBody = {
    is_active: false,
  } satisfies ICommunityPlatformSystemConfig.IUpdate;

  const updatedConfig1: ICommunityPlatformSystemConfig =
    await api.functional.communityPlatform.adminUser.systemConfigs.update(
      connection,
      {
        systemConfigId: createdConfig.id,
        body: firstUpdateBody,
      },
    );
  typia.assert(updatedConfig1);

  // Invariants after first toggle
  TestValidator.equals(
    "id should remain unchanged after first toggle",
    updatedConfig1.id,
    originalId,
  );
  TestValidator.equals(
    "category should remain unchanged after first toggle",
    updatedConfig1.category ?? null,
    originalCategory,
  );
  TestValidator.equals(
    "config_key should remain unchanged after first toggle",
    updatedConfig1.config_key,
    originalConfigKey,
  );
  TestValidator.equals(
    "value should remain unchanged after first toggle",
    updatedConfig1.value,
    originalValue,
  );
  TestValidator.equals(
    "description should remain unchanged after first toggle",
    updatedConfig1.description ?? null,
    originalDescription,
  );
  TestValidator.equals(
    "is_active should be false after first toggle",
    updatedConfig1.is_active,
    false,
  );

  // created_at must stay the same
  TestValidator.equals(
    "created_at should remain unchanged after first toggle",
    updatedConfig1.created_at,
    originalCreatedAt,
  );

  // updated_at must be advanced
  TestValidator.predicate(
    "updated_at should advance after first toggle",
    updatedConfig1.updated_at > originalUpdatedAt,
  );

  // Soft delete lifecycle stays unaffected
  TestValidator.equals(
    "deleted_at should remain null or undefined after first toggle",
    updatedConfig1.deleted_at ?? null,
    null,
  );

  const afterFirstToggleUpdatedAt = updatedConfig1.updated_at;

  // 4. Second toggle: set is_active back to true
  const secondUpdateBody = {
    is_active: true,
  } satisfies ICommunityPlatformSystemConfig.IUpdate;

  const updatedConfig2: ICommunityPlatformSystemConfig =
    await api.functional.communityPlatform.adminUser.systemConfigs.update(
      connection,
      {
        systemConfigId: createdConfig.id,
        body: secondUpdateBody,
      },
    );
  typia.assert(updatedConfig2);

  // Invariants after second toggle
  TestValidator.equals(
    "id should remain unchanged after second toggle",
    updatedConfig2.id,
    originalId,
  );
  TestValidator.equals(
    "category should remain unchanged after second toggle",
    updatedConfig2.category ?? null,
    originalCategory,
  );
  TestValidator.equals(
    "config_key should remain unchanged after second toggle",
    updatedConfig2.config_key,
    originalConfigKey,
  );
  TestValidator.equals(
    "value should remain unchanged after second toggle",
    updatedConfig2.value,
    originalValue,
  );
  TestValidator.equals(
    "description should remain unchanged after second toggle",
    updatedConfig2.description ?? null,
    originalDescription,
  );
  TestValidator.equals(
    "is_active should be true after second toggle",
    updatedConfig2.is_active,
    true,
  );

  // created_at must still be unchanged
  TestValidator.equals(
    "created_at should remain unchanged after second toggle",
    updatedConfig2.created_at,
    originalCreatedAt,
  );

  // updated_at must be advanced again
  TestValidator.predicate(
    "updated_at should advance again after second toggle",
    updatedConfig2.updated_at > afterFirstToggleUpdatedAt,
  );

  // Soft delete lifecycle stays unaffected
  TestValidator.equals(
    "deleted_at should remain null or undefined after second toggle",
    updatedConfig2.deleted_at ?? null,
    null,
  );
}
