import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_platform_admin_configurations_create } from "../../../generate/generate_random_community_platform_admin_configurations_create";
import { prepare_random_community_platform_configuration } from "../../../prepare/prepare_random_community_platform_configuration";

/**
 * Test reactivating a soft-deleted configuration by updating it.
 * 1. Create a configuration as admin
 * 2. Mark configuration as inactive (simulating soft-delete)
 * 3. Update the inactive configuration with new values
 * 4. Verify reactivation by checking configuration becomes active again
 */
export async function test_api_configuration_reactivate_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup and create configuration
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const configuration =
    await generate_random_community_platform_admin_configurations_create(
      adminConnection,
      {
        body: {
          config_key: RandomGenerator.alphabets(8),
          config_value: RandomGenerator.paragraph({ sentences: 1 }),
          data_type: "string",
          scope: "global",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          is_active: true,
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(configuration);
  // 2. Mark configuration as inactive (simulating soft-delete)
  const inactiveConfiguration =
    await api.functional.communityPlatform.admin.configurations.update(
      adminConnection,
      {
        configurationId: configuration.id,
        body: {
          is_active: false,
        } satisfies ICommunityPlatformConfiguration.IUpdate,
      },
    );
  typia.assert(inactiveConfiguration);
  // Verify configuration is inactive
  TestValidator.equals(
    "configuration is inactive",
    inactiveConfiguration.is_active,
    false,
  );
  // 3. Reactivate the configuration by updating with new values
  const newConfigValue = RandomGenerator.paragraph({ sentences: 1 });
  const newDescription = RandomGenerator.paragraph({ sentences: 2 });
  const reactivatedConfiguration =
    await api.functional.communityPlatform.admin.configurations.update(
      adminConnection,
      {
        configurationId: configuration.id,
        body: {
          config_value: newConfigValue,
          is_active: true,
          description: newDescription,
        } satisfies ICommunityPlatformConfiguration.IUpdate,
      },
    );
  typia.assert(reactivatedConfiguration);
  // 4. Verify reactivation
  TestValidator.equals(
    "configuration is active again",
    reactivatedConfiguration.is_active,
    true,
  );
  TestValidator.equals(
    "config_value updated",
    reactivatedConfiguration.config_value,
    newConfigValue,
  );
  TestValidator.equals(
    "description updated",
    reactivatedConfiguration.description,
    newDescription,
  );
  TestValidator.notEquals(
    "updated_at changed",
    reactivatedConfiguration.updated_at,
    configuration.updated_at,
  );
  // Verify immutable fields remain unchanged
  TestValidator.equals(
    "config_key unchanged",
    reactivatedConfiguration.config_key,
    configuration.config_key,
  );
  TestValidator.equals(
    "data_type unchanged",
    reactivatedConfiguration.data_type,
    configuration.data_type,
  );
  TestValidator.equals(
    "scope unchanged",
    reactivatedConfiguration.scope,
    configuration.scope,
  );
  TestValidator.equals(
    "created_at unchanged",
    reactivatedConfiguration.created_at,
    configuration.created_at,
  );
}
