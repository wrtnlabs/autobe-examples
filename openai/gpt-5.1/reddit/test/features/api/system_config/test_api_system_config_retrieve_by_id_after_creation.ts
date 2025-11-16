import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemConfig";

export async function test_api_system_config_retrieve_by_id_after_creation(
  connection: api.IConnection,
) {
  // 1. Register a new adminUser (admin join)
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const authorizedAdmin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedAdmin);

  // 2. Create a new system configuration as this adminUser
  const createBody = {
    category: "auth",
    config_key: `auth_session_timeout_seconds_${RandomGenerator.alphaNumeric(8)}`,
    value: "3600",
    description: RandomGenerator.paragraph({ sentences: 4 }),
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

  // 3. Retrieve the configuration by its id
  const reloadedConfig: ICommunityPlatformSystemConfig =
    await api.functional.communityPlatform.adminUser.systemConfigs.at(
      connection,
      {
        systemConfigId: createdConfig.id,
      },
    );
  typia.assert(reloadedConfig);

  // 4. Field-level equality assertions
  TestValidator.equals(
    "system config id should match between create and get",
    reloadedConfig.id,
    createdConfig.id,
  );

  TestValidator.equals(
    "system config category should match between create and get",
    reloadedConfig.category ?? null,
    createdConfig.category ?? null,
  );

  TestValidator.equals(
    "system config config_key should match between create and get",
    reloadedConfig.config_key,
    createdConfig.config_key,
  );

  TestValidator.equals(
    "system config value should match between create and get",
    reloadedConfig.value,
    createdConfig.value,
  );

  TestValidator.equals(
    "system config description should match between create and get",
    reloadedConfig.description ?? null,
    createdConfig.description ?? null,
  );

  TestValidator.equals(
    "system config is_active should match between create and get",
    reloadedConfig.is_active,
    createdConfig.is_active,
  );

  // 5. created_at and updated_at checks
  TestValidator.predicate(
    "created_at should be a non-empty ISO string on created config",
    createdConfig.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at should be a non-empty ISO string on created config",
    createdConfig.updated_at.length > 0,
  );

  TestValidator.predicate(
    "created_at should be a non-empty ISO string on reloaded config",
    reloadedConfig.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at should be a non-empty ISO string on reloaded config",
    reloadedConfig.updated_at.length > 0,
  );

  TestValidator.predicate(
    "updated_at must be same or after created_at on reloaded config",
    reloadedConfig.updated_at >= reloadedConfig.created_at,
  );

  // 6. deleted_at should be null or undefined for a freshly created config
  TestValidator.equals(
    "created config deleted_at should be null or undefined",
    createdConfig.deleted_at ?? null,
    null,
  );

  TestValidator.equals(
    "reloaded config deleted_at should be null or undefined",
    reloadedConfig.deleted_at ?? null,
    null,
  );
}
