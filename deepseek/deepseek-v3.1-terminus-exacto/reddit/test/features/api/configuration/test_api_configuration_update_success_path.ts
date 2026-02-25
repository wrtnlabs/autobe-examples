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

export async function test_api_configuration_update_success_path(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin user
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create a configuration with boolean type
  const configuration =
    await generate_random_community_platform_admin_configurations_create(
      adminConnection,
      {
        body: {
          config_key: RandomGenerator.alphabets(10),
          config_value: "true",
          data_type: "boolean",
          scope: "global",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          is_active: true,
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(configuration);
  // 3. Update the configuration value
  const updatedConfiguration =
    await api.functional.communityPlatform.admin.configurations.update(
      adminConnection,
      {
        configurationId: configuration.id,
        body: {
          config_value: "false",
        } satisfies ICommunityPlatformConfiguration.IUpdate,
      },
    );
  typia.assert(updatedConfiguration);
  // 4. Validate the update was successful
  TestValidator.equals(
    "configuration ID unchanged",
    updatedConfiguration.id,
    configuration.id,
  );
  TestValidator.equals(
    "config_key unchanged",
    updatedConfiguration.config_key,
    configuration.config_key,
  );
  TestValidator.equals(
    "data_type unchanged",
    updatedConfiguration.data_type,
    configuration.data_type,
  );
  TestValidator.equals(
    "scope unchanged",
    updatedConfiguration.scope,
    configuration.scope,
  );
  TestValidator.equals(
    "config_value updated",
    updatedConfiguration.config_value,
    "false",
  );
  TestValidator.equals(
    "is_active unchanged",
    updatedConfiguration.is_active,
    configuration.is_active,
  );
  TestValidator.equals(
    "description unchanged",
    updatedConfiguration.description,
    configuration.description,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updatedConfiguration.updated_at,
    configuration.updated_at,
  );
}
