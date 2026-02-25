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
 * Test the basic workflow of creating a global platform configuration setting.
 * 1. Create admin account using authorize_admin_join utility function
 * 2. Create configuration with valid data (config_key, config_value, data_type='string', scope='global', description, is_active=true)
 * 3. Verify response contains complete configuration object with system-generated fields
 * 4. Validate timestamps are properly set and configuration is immediately active
 */
export async function test_api_configuration_creation_basic_global_setting(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Register and authenticate admin using utility function
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // Create configuration with valid data using utility function
  const configurationInput: ICommunityPlatformConfiguration.ICreate = {
    config_key: RandomGenerator.alphabets(10),
    config_value: RandomGenerator.paragraph({ sentences: 1 }),
    data_type: "string",
    scope: "global",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    is_active: true,
  };
  const configuration =
    await generate_random_community_platform_admin_configurations_create(
      adminConnection,
      { body: configurationInput },
    );
  typia.assert(configuration);
  // Validate input values match response
  TestValidator.equals(
    "config_key matches input",
    configuration.config_key,
    configurationInput.config_key,
  );
  TestValidator.equals(
    "config_value matches input",
    configuration.config_value,
    configurationInput.config_value,
  );
  TestValidator.equals(
    "data_type matches input",
    configuration.data_type,
    configurationInput.data_type,
  );
  TestValidator.equals(
    "scope matches input",
    configuration.scope,
    configurationInput.scope,
  );
  TestValidator.equals(
    "description matches input",
    configuration.description,
    configurationInput.description,
  );
  TestValidator.equals(
    "is_active matches input",
    configuration.is_active,
    configurationInput.is_active,
  );
  // Validate configuration is immediately active
  TestValidator.predicate("configuration is active", configuration.is_active);
  TestValidator.equals(
    "deleted_at is null for active configuration",
    configuration.deleted_at,
    null,
  );
}
