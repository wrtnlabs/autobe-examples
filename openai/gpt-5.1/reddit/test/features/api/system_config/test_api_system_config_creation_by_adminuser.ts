import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemConfig";

/**
 * Validate that an authenticated adminUser can create a new system
 * configuration.
 *
 * Business flow:
 *
 * 1. Register a new adminUser via /auth/adminUser/join.
 * 2. Use the authenticated admin context (token handled by SDK) to call POST
 *    /communityPlatform/adminUser/systemConfigs with a concrete
 *    ICommunityPlatformSystemConfig.ICreate payload.
 * 3. Verify that the returned ICommunityPlatformSystemConfig reflects the request
 *    fields and is initialized with correct lifecycle state (non-null
 *    created_at/updated_at, deleted_at null, active flag true).
 */
export async function test_api_system_config_creation_by_adminuser(
  connection: api.IConnection,
) {
  // 1. Register (join) a new adminUser and obtain authorized context.
  const joinBody = typia.random<ICommunityPlatformAdminUserJoin.IRequest>();

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Prepare deterministic system configuration creation payload.
  const configCreateBody = {
    category: "auth",
    config_key: "max_login_attempts",
    value: '{"max":5}',
    description: "Maximum allowed login attempts before lockout.",
    is_active: true,
  } satisfies ICommunityPlatformSystemConfig.ICreate;

  // 3. Create the system configuration using the authenticated adminUser.
  const createdConfig: ICommunityPlatformSystemConfig =
    await api.functional.communityPlatform.adminUser.systemConfigs.create(
      connection,
      {
        body: configCreateBody,
      },
    );
  typia.assert(createdConfig);

  // 4. Validate core fields match the input payload.
  TestValidator.equals(
    "system config category should match input",
    createdConfig.category,
    configCreateBody.category,
  );

  TestValidator.equals(
    "system config config_key should match input",
    createdConfig.config_key,
    configCreateBody.config_key,
  );

  TestValidator.equals(
    "system config value should match input",
    createdConfig.value,
    configCreateBody.value,
  );

  TestValidator.equals(
    "system config description should match input",
    createdConfig.description,
    configCreateBody.description,
  );

  TestValidator.equals(
    "system config active flag should match input",
    createdConfig.is_active,
    configCreateBody.is_active,
  );

  // 5. Lifecycle expectations: new config must not be soft-deleted.
  TestValidator.equals(
    "system config deleted_at should be null on creation",
    createdConfig.deleted_at ?? null,
    null,
  );

  // Timestamps (created_at and updated_at) are fully validated by typia.assert
  // against tags.Format<"date-time">, so no additional checks are required.
}
