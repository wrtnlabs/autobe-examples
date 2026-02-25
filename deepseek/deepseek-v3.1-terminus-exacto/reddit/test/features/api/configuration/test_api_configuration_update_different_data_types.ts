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

export async function test_api_configuration_update_different_data_types(
  connection: api.IConnection,
): Promise<void> {
  // Create authorized admin connection using utility function
  const authorizedAdmin = await authorize_admin_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "admin_password_123",
        display_name: "Test Admin",
        permissions_level: null,
      } satisfies ICommunityPlatformAdmin.IJoin,
    },
  );
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: authorizedAdmin.token.access },
  };
  // Test data type configurations
  const dataTypes = [
    {
      type: "boolean",
      value: "true",
      updateValue: "false",
      description: "Boolean toggle for feature flag",
    },
    {
      type: "integer",
      value: "100",
      updateValue: "999",
      description: "Integer value for maximum retries",
    },
    {
      type: "string",
      value: "initial value",
      updateValue: "updated value",
      description: "String configuration for app name",
    },
    {
      type: "json",
      value: '{"key": "value"}',
      updateValue: '{"nested": {"object": true}}',
      description: "JSON configuration for complex settings",
    },
  ];
  const createdConfigs: ICommunityPlatformConfiguration[] = [];
  // Create configurations with different data types
  for (const dataType of dataTypes) {
    const config =
      await generate_random_community_platform_admin_configurations_create(
        adminConnection,
        {
          body: {
            config_key: `test_${dataType.type}_${RandomGenerator.alphabets(5)}`,
            config_value: dataType.value,
            data_type: dataType.type,
            scope: "global",
            description: dataType.description,
            is_active: true,
          } satisfies ICommunityPlatformConfiguration.ICreate,
        },
      );
    typia.assert(config);
    createdConfigs.push(config);
  }
  // Update configurations with compatible values
  for (const [index, config] of createdConfigs.entries()) {
    const dataType = dataTypes[index];
    const updatedConfig =
      await api.functional.communityPlatform.admin.configurations.update(
        adminConnection,
        {
          configurationId: config.id,
          body: {
            config_value: dataType.updateValue,
          } satisfies ICommunityPlatformConfiguration.IUpdate,
        },
      );
    typia.assert(updatedConfig);
    TestValidator.equals(
      `${dataType.type} config value updated`,
      updatedConfig.config_value,
      dataType.updateValue,
    );
  }
  // Test edge cases for integer type
  const integerConfig = createdConfigs.find((c) => c.data_type === "integer");
  if (integerConfig) {
    // Test minimum value
    const minUpdate =
      await api.functional.communityPlatform.admin.configurations.update(
        adminConnection,
        {
          configurationId: integerConfig.id,
          body: {
            config_value: "0",
          } satisfies ICommunityPlatformConfiguration.IUpdate,
        },
      );
    typia.assert(minUpdate);
    // Test large value
    const largeUpdate =
      await api.functional.communityPlatform.admin.configurations.update(
        adminConnection,
        {
          configurationId: integerConfig.id,
          body: {
            config_value: "999999",
          } satisfies ICommunityPlatformConfiguration.IUpdate,
        },
      );
    typia.assert(largeUpdate);
  }
  // Test edge cases for JSON type
  const jsonConfig = createdConfigs.find((c) => c.data_type === "json");
  if (jsonConfig) {
    // Test complex nested object
    const complexJson =
      '{"users": [{"id": 1, "name": "John", "settings": {"notifications": true, "theme": "dark"}}], "metadata": {"version": "1.0", "enabled": true}}';
    const complexUpdate =
      await api.functional.communityPlatform.admin.configurations.update(
        adminConnection,
        {
          configurationId: jsonConfig.id,
          body: {
            config_value: complexJson,
          } satisfies ICommunityPlatformConfiguration.IUpdate,
        },
      );
    typia.assert(complexUpdate);
    // Test array JSON
    const arrayJson =
      '[{"id": 1, "value": "test"}, {"id": 2, "value": "another"}]';
    const arrayUpdate =
      await api.functional.communityPlatform.admin.configurations.update(
        adminConnection,
        {
          configurationId: jsonConfig.id,
          body: {
            config_value: arrayJson,
          } satisfies ICommunityPlatformConfiguration.IUpdate,
        },
      );
    typia.assert(arrayUpdate);
  }
  // Test string type edge cases
  const stringConfig = createdConfigs.find((c) => c.data_type === "string");
  if (stringConfig) {
    // Test empty string
    const emptyUpdate =
      await api.functional.communityPlatform.admin.configurations.update(
        adminConnection,
        {
          configurationId: stringConfig.id,
          body: {
            config_value: "",
          } satisfies ICommunityPlatformConfiguration.IUpdate,
        },
      );
    typia.assert(emptyUpdate);
    // Test special characters
    const specialUpdate =
      await api.functional.communityPlatform.admin.configurations.update(
        adminConnection,
        {
          configurationId: stringConfig.id,
          body: {
            config_value: "Special!@#$%^&*()_+-=[]{}|;:,.<>?",
          } satisfies ICommunityPlatformConfiguration.IUpdate,
        },
      );
    typia.assert(specialUpdate);
  }
}
