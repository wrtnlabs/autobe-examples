import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemConfig";

export async function test_api_system_config_update_basic_fields_by_adminuser(
  connection: api.IConnection,
) {
  // 1. Create an adminUser and establish authenticated context
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Admin!234" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create baseline system configuration
  const createBody = {
    category: "auth",
    config_key: "session_timeout_seconds",
    value: "3600",
    description: "Default session timeout in seconds",
    is_active: true,
  } satisfies ICommunityPlatformSystemConfig.ICreate;

  const originalConfig: ICommunityPlatformSystemConfig =
    await api.functional.communityPlatform.adminUser.systemConfigs.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(originalConfig);

  // Basic sanity checks on created config
  TestValidator.equals(
    "created config category should match input",
    originalConfig.category,
    createBody.category ?? null,
  );
  TestValidator.equals(
    "created config key should match input",
    originalConfig.config_key,
    createBody.config_key,
  );
  TestValidator.equals(
    "created config value should match input",
    originalConfig.value,
    createBody.value,
  );
  TestValidator.equals(
    "created config description should match input",
    originalConfig.description,
    createBody.description ?? null,
  );
  TestValidator.equals(
    "created config is_active should match input",
    originalConfig.is_active,
    createBody.is_active,
  );

  // Ensure deleted_at is null or undefined at creation time
  TestValidator.predicate(
    "created config deleted_at should be null or undefined",
    originalConfig.deleted_at === null ||
      originalConfig.deleted_at === undefined,
  );

  const originalUpdatedAt = originalConfig.updated_at;
  const originalCreatedAt = originalConfig.created_at;
  const originalDeletedAt =
    originalConfig.deleted_at === undefined ? null : originalConfig.deleted_at;

  // 3. Update mutable fields on the existing config
  const updatedValue = "7200";
  const updatedDescription = "Extended session timeout in seconds";
  const updatedIsActive = true;

  const updateBody = {
    value: updatedValue,
    description: updatedDescription,
    is_active: updatedIsActive,
  } satisfies ICommunityPlatformSystemConfig.IUpdate;

  const updatedConfig: ICommunityPlatformSystemConfig =
    await api.functional.communityPlatform.adminUser.systemConfigs.update(
      connection,
      {
        systemConfigId: originalConfig.id,
        body: updateBody,
      },
    );
  typia.assert(updatedConfig);

  // 4. Validate immutable fields are preserved
  TestValidator.equals(
    "config id should remain unchanged after update",
    updatedConfig.id,
    originalConfig.id,
  );

  TestValidator.equals(
    "created_at should remain unchanged after update",
    updatedConfig.created_at,
    originalCreatedAt,
  );

  // 5. Validate category and config_key remain unchanged
  TestValidator.equals(
    "category should remain unchanged when not provided in update",
    updatedConfig.category,
    originalConfig.category ?? null,
  );

  TestValidator.equals(
    "config_key should remain unchanged when not provided in update",
    updatedConfig.config_key,
    originalConfig.config_key,
  );

  // 6. Validate mutable fields reflect new values
  TestValidator.equals(
    "updated config value should reflect new timeout",
    updatedConfig.value,
    updatedValue,
  );

  TestValidator.equals(
    "updated config description should reflect new description",
    updatedConfig.description,
    updatedDescription,
  );

  TestValidator.equals(
    "updated config is_active should reflect updated flag",
    updatedConfig.is_active,
    updatedIsActive,
  );

  // 7. Validate updated_at has advanced
  TestValidator.predicate(
    "updated_at should be different from original after update",
    updatedConfig.updated_at !== originalUpdatedAt,
  );

  TestValidator.predicate(
    "updated_at should be later than or equal to original updated_at",
    new Date(updatedConfig.updated_at).getTime() >=
      new Date(originalUpdatedAt).getTime(),
  );

  // 8. Validate deleted_at remains unchanged
  const updatedDeletedAt =
    updatedConfig.deleted_at === undefined ? null : updatedConfig.deleted_at;
  TestValidator.equals(
    "deleted_at should remain unchanged after update",
    updatedDeletedAt,
    originalDeletedAt,
  );
}
