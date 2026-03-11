import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import type { IMultiUserTodoSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoSystemConfiguration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_multi_user_todo_admin_system_configurations_create } from "../../../generate/generate_random_multi_user_todo_admin_system_configurations_create";
import { prepare_random_multi_user_todo_system_configuration } from "../../../prepare/prepare_random_multi_user_todo_system_configuration";

/**
 * Test deployment of a feature flag configuration that uses boolean data_type.
 * Authenticate as admin, then create a configuration with data_type 'boolean'
 * and config_value 'true' representing an enabled feature flag. Validate that
 * the boolean value is properly stored and returned. Create another configuration
 * with data_type 'json' for complex structured configuration like application
 * settings. Test different scopes: create a 'global' feature flag, a 'component'-
 * specific setting, and an 'environment' configuration. Verify that all
 * configurations are active by default (is_active=true) and have proper version
 * tracking starting at 1. This tests realistic admin workflow of deploying
 * multiple configuration types for system management.
 */
export async function test_api_admin_system_configuration_feature_flag_deployment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IMultiUserTodoAdmin.IJoin,
  });
  // 2. Create boolean feature flag (global scope)
  const booleanFlag =
    await generate_random_multi_user_todo_admin_system_configurations_create(
      adminConnection,
      {
        body: {
          config_key: `feature_flag_${RandomGenerator.alphabets(8)}`,
          config_value: "true",
          data_type: "boolean",
          scope: "global",
          description: "Feature flag for new user interface",
          is_active: true,
        } satisfies IMultiUserTodoSystemConfiguration.ICreate,
      },
    );
  typia.assert(booleanFlag);
  TestValidator.equals("boolean data_type", booleanFlag.data_type, "boolean");
  TestValidator.equals(
    "boolean config_value",
    booleanFlag.config_value,
    "true",
  );
  TestValidator.equals("global scope", booleanFlag.scope, "global");
  TestValidator.predicate(
    "is_active defaults to true",
    booleanFlag.is_active === true,
  );
  TestValidator.equals("version starts at 1", booleanFlag.version, 1);
  // 3. Create JSON configuration (component scope)
  const jsonConfig =
    await generate_random_multi_user_todo_admin_system_configurations_create(
      adminConnection,
      {
        body: {
          config_key: `app_settings_${RandomGenerator.alphabets(8)}`,
          config_value: JSON.stringify({
            max_upload_size: 10485760,
            allowed_extensions: ["jpg", "png", "pdf"],
            enable_notifications: true,
            retry_attempts: 3,
          }),
          data_type: "json",
          scope: "component",
          description: "Application settings for file upload component",
          // is_active omitted to test default
        } satisfies IMultiUserTodoSystemConfiguration.ICreate,
      },
    );
  typia.assert(jsonConfig);
  TestValidator.equals("json data_type", jsonConfig.data_type, "json");
  TestValidator.predicate("valid JSON string", () => {
    try {
      JSON.parse(jsonConfig.config_value);
      return true;
    } catch {
      return false;
    }
  });
  TestValidator.equals("component scope", jsonConfig.scope, "component");
  TestValidator.predicate(
    "is_active defaults to true when omitted",
    jsonConfig.is_active === true,
  );
  TestValidator.equals("version starts at 1 for JSON", jsonConfig.version, 1);
  // Verify JSON content
  const parsedJson = JSON.parse(jsonConfig.config_value);
  TestValidator.equals(
    "JSON has max_upload_size",
    parsedJson.max_upload_size,
    10485760,
  );
  TestValidator.equals(
    "JSON has allowed_extensions array length",
    parsedJson.allowed_extensions.length,
    3,
  );
  TestValidator.predicate(
    "JSON has enable_notifications boolean",
    typeof parsedJson.enable_notifications === "boolean",
  );
  // 4. Create environment-specific configuration
  const envConfig =
    await generate_random_multi_user_todo_admin_system_configurations_create(
      adminConnection,
      {
        body: {
          config_key: `env_var_${RandomGenerator.alphabets(8)}`,
          config_value: "production-database-url",
          data_type: "string",
          scope: "environment",
          description: "Database URL for production environment",
          is_active: true,
        } satisfies IMultiUserTodoSystemConfiguration.ICreate,
      },
    );
  typia.assert(envConfig);
  TestValidator.equals("string data_type", envConfig.data_type, "string");
  TestValidator.equals("environment scope", envConfig.scope, "environment");
  TestValidator.equals(
    "config_value matches",
    envConfig.config_value,
    "production-database-url",
  );
  TestValidator.predicate(
    "is_active true when explicitly set",
    envConfig.is_active === true,
  );
  TestValidator.equals("version starts at 1 for env", envConfig.version, 1);
  // 5. Verify all configurations have unique keys
  const keys = [
    booleanFlag.config_key,
    jsonConfig.config_key,
    envConfig.config_key,
  ];
  TestValidator.notEquals("boolean and JSON keys differ", keys[0], keys[1]);
  TestValidator.notEquals("boolean and env keys differ", keys[0], keys[2]);
  TestValidator.notEquals("JSON and env keys differ", keys[1], keys[2]);
  // 6. Validate UUID format for all IDs
  TestValidator.predicate(
    "boolean flag has UUID ID",
    /^[0-9a-f-]{36}$/i.test(booleanFlag.id),
  );
  TestValidator.predicate(
    "JSON config has UUID ID",
    /^[0-9a-f-]{36}$/i.test(jsonConfig.id),
  );
  TestValidator.predicate(
    "env config has UUID ID",
    /^[0-9a-f-]{36}$/i.test(envConfig.id),
  );
  // 7. Validate timestamps are ISO format
  TestValidator.predicate("boolean flag has ISO created_at", () => {
    return !isNaN(Date.parse(booleanFlag.created_at));
  });
  TestValidator.predicate("JSON config has ISO created_at", () => {
    return !isNaN(Date.parse(jsonConfig.created_at));
  });
  TestValidator.predicate("env config has ISO created_at", () => {
    return !isNaN(Date.parse(envConfig.created_at));
  });
  // 8. Validate deleted_at is null for active configurations
  TestValidator.equals(
    "boolean flag deleted_at null",
    booleanFlag.deleted_at,
    null,
  );
  TestValidator.equals(
    "JSON config deleted_at null",
    jsonConfig.deleted_at,
    null,
  );
  TestValidator.equals(
    "env config deleted_at null",
    envConfig.deleted_at,
    null,
  );
}
