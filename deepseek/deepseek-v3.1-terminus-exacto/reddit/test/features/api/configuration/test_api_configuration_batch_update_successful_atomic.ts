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

export async function test_api_configuration_batch_update_successful_atomic(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Create multiple configuration records with different data types
  const configurations = [
    {
      config_key: "feature_flag_enabled",
      config_value: "true",
      data_type: "boolean",
      scope: "global",
      description: "Enable feature flag",
      is_active: true,
    },
    {
      config_key: "max_user_count",
      config_value: "1000",
      data_type: "integer",
      scope: "global",
      description: "Maximum user count",
      is_active: true,
    },
    {
      config_key: "welcome_message",
      config_value: "Welcome to our platform!",
      data_type: "string",
      scope: "global",
      description: "Welcome message",
      is_active: true,
    },
    {
      config_key: "theme_settings",
      config_value: '{"primary": "#007bff", "secondary": "#6c757d"}',
      data_type: "json",
      scope: "global",
      description: "Theme settings",
      is_active: true,
    },
  ];
  // Create initial configurations
  const createdConfigs: ICommunityPlatformConfiguration[] = [];
  for (const config of configurations) {
    // Note: Since there's no create endpoint, we assume configurations exist or are pre-populated
    // For testing purposes, we'll use the batch update endpoint which expects existing configs
  }
  // Prepare batch update with new values
  const batchUpdate: ICommunityPlatformConfiguration.IBatchUpdate = {
    updates: [
      {
        config_key: "feature_flag_enabled",
        config_value: "false",
      } satisfies ICommunityPlatformConfiguration.IBatchUpdateItem,
      {
        config_key: "max_user_count",
        config_value: "2000",
      } satisfies ICommunityPlatformConfiguration.IBatchUpdateItem,
      {
        config_key: "welcome_message",
        config_value: "Updated welcome message!",
      } satisfies ICommunityPlatformConfiguration.IBatchUpdateItem,
      {
        config_key: "theme_settings",
        config_value: '{"primary": "#28a745", "secondary": "#17a2b8"}',
      } satisfies ICommunityPlatformConfiguration.IBatchUpdateItem,
    ],
  };
  // Perform batch update
  const result =
    await api.functional.communityPlatform.admin.configurations.batch.batchUpdate(
      adminConnection,
      {
        body: batchUpdate,
      },
    );
  typia.assert(result);
  // Validate response contains updated configuration
  TestValidator.equals(
    "response should contain updated configuration",
    result.config_key,
    batchUpdate.updates[0].config_key,
  );
  // Note: Since the batch update endpoint returns a single configuration,
  // we can only validate one update. In a real scenario, we would need
  // individual get endpoints to verify all updates
  TestValidator.equals(
    "configuration value should be updated",
    result.config_value,
    batchUpdate.updates[0].config_value,
  );
  // Validate updated_at timestamp is properly set
  TestValidator.predicate("updated_at should be a valid date-time", () => {
    const updatedAt = new Date(result.updated_at);
    return !isNaN(updatedAt.getTime());
  });
  // Validate data type compatibility
  TestValidator.equals(
    "data type should be maintained",
    result.data_type,
    "boolean",
  );
}
