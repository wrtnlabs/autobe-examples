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

export async function test_api_configuration_creation_feature_flag_environment(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as admin using utility function
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Test 1: Create boolean feature flag for environment scope
  const booleanInput = {
    config_key: `feature.flag.${RandomGenerator.alphaNumeric(8)}`,
    config_value: "true",
    data_type: "boolean",
    scope: "environment",
    description: "Feature flag controlling experimental environment feature",
    is_active: true,
  } satisfies ICommunityPlatformConfiguration.ICreate;
  const booleanConfig =
    await generate_random_community_platform_admin_configurations_create(
      adminConnection,
      { body: booleanInput },
    );
  typia.assert(booleanConfig);
  // Validate boolean configuration properties
  TestValidator.equals(
    "config_key matches input",
    booleanConfig.config_key,
    booleanInput.config_key,
  );
  TestValidator.equals(
    "config_value is 'true'",
    booleanConfig.config_value,
    "true",
  );
  TestValidator.equals(
    "data_type is boolean",
    booleanConfig.data_type,
    "boolean",
  );
  TestValidator.equals(
    "scope is environment",
    booleanConfig.scope,
    "environment",
  );
  TestValidator.predicate(
    "is_active is true",
    booleanConfig.is_active === true,
  );
  TestValidator.predicate(
    "has valid UUID",
    /^[0-9a-f-]{36}$/i.test(booleanConfig.id),
  );
  TestValidator.predicate(
    "has creation timestamp",
    booleanConfig.created_at !== undefined,
  );
  // Test 2: Create integer configuration for global scope
  const integerValue = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100>
  >();
  const integerInput = {
    config_key: `global.setting.${RandomGenerator.alphaNumeric(8)}`,
    config_value: integerValue.toString(),
    data_type: "integer",
    scope: "global",
    description: "Global integer setting for system configuration",
    is_active: true,
  } satisfies ICommunityPlatformConfiguration.ICreate;
  const integerConfig =
    await generate_random_community_platform_admin_configurations_create(
      adminConnection,
      { body: integerInput },
    );
  typia.assert(integerConfig);
  // Validate integer configuration properties
  TestValidator.equals(
    "config_key matches input",
    integerConfig.config_key,
    integerInput.config_key,
  );
  TestValidator.equals(
    "data_type is integer",
    integerConfig.data_type,
    "integer",
  );
  TestValidator.equals("scope is global", integerConfig.scope, "global");
  TestValidator.predicate(
    "config_value matches integer input",
    integerConfig.config_value === integerValue.toString(),
  );
  // Test 3: Create string configuration for feature scope
  const stringValue = RandomGenerator.paragraph({ sentences: 2 });
  const stringInput = {
    config_key: `feature.setting.${RandomGenerator.alphaNumeric(8)}`,
    config_value: stringValue,
    data_type: "string",
    scope: "feature",
    description: "String configuration for feature-specific settings",
    is_active: false,
  } satisfies ICommunityPlatformConfiguration.ICreate;
  const stringConfig =
    await generate_random_community_platform_admin_configurations_create(
      adminConnection,
      { body: stringInput },
    );
  typia.assert(stringConfig);
  // Validate string configuration properties
  TestValidator.equals(
    "config_key matches input",
    stringConfig.config_key,
    stringInput.config_key,
  );
  TestValidator.equals("data_type is string", stringConfig.data_type, "string");
  TestValidator.equals("scope is feature", stringConfig.scope, "feature");
  TestValidator.equals(
    "config_value matches string input",
    stringConfig.config_value,
    stringValue,
  );
  TestValidator.predicate(
    "is_active is false",
    stringConfig.is_active === false,
  );
  // Test 4: Create JSON configuration for user_group scope
  const jsonData = {
    permissions: ["read", "write"],
    limits: { max_requests: 1000 },
  };
  const jsonInput = {
    config_key: `user.group.${RandomGenerator.alphaNumeric(8)}`,
    config_value: JSON.stringify(jsonData),
    data_type: "json",
    scope: "user_group",
    description: "JSON configuration for user group settings",
    is_active: true,
  } satisfies ICommunityPlatformConfiguration.ICreate;
  const jsonConfig =
    await generate_random_community_platform_admin_configurations_create(
      adminConnection,
      { body: jsonInput },
    );
  typia.assert(jsonConfig);
  // Validate JSON configuration properties
  TestValidator.equals(
    "config_key matches input",
    jsonConfig.config_key,
    jsonInput.config_key,
  );
  TestValidator.equals("data_type is json", jsonConfig.data_type, "json");
  TestValidator.equals("scope is user_group", jsonConfig.scope, "user_group");
  TestValidator.predicate("config_value is valid JSON", () => {
    try {
      const parsed = JSON.parse(jsonConfig.config_value);
      return typeof parsed === "object" && parsed !== null;
    } catch {
      return false;
    }
  });
  TestValidator.predicate("JSON content matches structure", () => {
    const parsed = JSON.parse(jsonConfig.config_value);
    return (
      Array.isArray(parsed.permissions) &&
      typeof parsed.limits === "object" &&
      typeof parsed.limits.max_requests === "number"
    );
  });
}
