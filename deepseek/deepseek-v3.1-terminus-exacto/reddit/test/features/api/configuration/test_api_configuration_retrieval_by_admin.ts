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

export async function test_api_configuration_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
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
  // Create a test configuration
  const configuration =
    await generate_random_community_platform_admin_configurations_create(
      adminConnection,
      {
        body: {
          config_key: RandomGenerator.alphaNumeric(10),
          config_value: RandomGenerator.paragraph({ sentences: 1 }),
          data_type: "string",
          scope: "global",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          is_active: true,
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(configuration);
  // Retrieve the configuration using the target endpoint
  const retrievedConfiguration =
    await api.functional.communityPlatform.admin.configurations.at(
      adminConnection,
      {
        configurationId: configuration.id,
      },
    );
  typia.assert(retrievedConfiguration);
  // Validate that all fields match the created configuration
  TestValidator.equals(
    "configuration id",
    retrievedConfiguration.id,
    configuration.id,
  );
  TestValidator.equals(
    "config key",
    retrievedConfiguration.config_key,
    configuration.config_key,
  );
  TestValidator.equals(
    "config value",
    retrievedConfiguration.config_value,
    configuration.config_value,
  );
  TestValidator.equals(
    "data type",
    retrievedConfiguration.data_type,
    configuration.data_type,
  );
  TestValidator.equals(
    "scope",
    retrievedConfiguration.scope,
    configuration.scope,
  );
  TestValidator.equals(
    "description",
    retrievedConfiguration.description,
    configuration.description,
  );
  TestValidator.equals(
    "is active",
    retrievedConfiguration.is_active,
    configuration.is_active,
  );
  TestValidator.predicate(
    "is active should be true",
    retrievedConfiguration.is_active === true,
  );
}
