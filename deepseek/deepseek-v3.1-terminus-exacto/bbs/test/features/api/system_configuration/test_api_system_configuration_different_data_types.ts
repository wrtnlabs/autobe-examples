import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_system_configurations_create } from "../../../generate/generate_random_discussion_board_super_admin_system_configurations_create";
import { prepare_random_discussion_board_system_configuration } from "../../../prepare/prepare_random_discussion_board_system_configuration";

/**
 * Test creation of configuration parameters with different data types (string, integer, boolean, json).
 * Validate that the data_type field correctly specifies the expected value format and that the system
 * handles different data types appropriately. Verify that configuration values are stored as strings
 * regardless of data type specification.
 */
export async function test_api_system_configuration_different_data_types(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test string data type
  const stringConfig =
    await generate_random_discussion_board_super_admin_system_configurations_create(
      superAdminConnection,
      {
        body: {
          config_key: RandomGenerator.alphabets(10),
          config_value: RandomGenerator.paragraph({ sentences: 2 }),
          data_type: "string",
          description: "Test string configuration parameter",
          category: "test",
          is_sensitive: false,
        } satisfies IDiscussionBoardSystemConfiguration.ICreate,
      },
    );
  typia.assert(stringConfig);
  TestValidator.equals(
    "string config data type",
    stringConfig.data_type,
    "string",
  );
  TestValidator.equals(
    "string config value type",
    typeof stringConfig.config_value,
    "string",
  );
  // Test integer data type
  const integerValue = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
  >();
  const integerConfig =
    await generate_random_discussion_board_super_admin_system_configurations_create(
      superAdminConnection,
      {
        body: {
          config_key: RandomGenerator.alphabets(10),
          config_value: integerValue.toString(),
          data_type: "integer",
          description: "Test integer configuration parameter",
          category: "test",
          is_sensitive: false,
        } satisfies IDiscussionBoardSystemConfiguration.ICreate,
      },
    );
  typia.assert(integerConfig);
  TestValidator.equals(
    "integer config data type",
    integerConfig.data_type,
    "integer",
  );
  TestValidator.equals(
    "integer config value type",
    typeof integerConfig.config_value,
    "string",
  );
  // Test boolean data type
  const booleanConfig =
    await generate_random_discussion_board_super_admin_system_configurations_create(
      superAdminConnection,
      {
        body: {
          config_key: RandomGenerator.alphabets(10),
          config_value: "true",
          data_type: "boolean",
          description: "Test boolean configuration parameter",
          category: "test",
          is_sensitive: false,
        } satisfies IDiscussionBoardSystemConfiguration.ICreate,
      },
    );
  typia.assert(booleanConfig);
  TestValidator.equals(
    "boolean config data type",
    booleanConfig.data_type,
    "boolean",
  );
  TestValidator.equals(
    "boolean config value type",
    typeof booleanConfig.config_value,
    "string",
  );
  // Test json data type
  const jsonData = { test: "value", number: 42, array: [1, 2, 3] };
  const jsonConfig =
    await generate_random_discussion_board_super_admin_system_configurations_create(
      superAdminConnection,
      {
        body: {
          config_key: RandomGenerator.alphabets(10),
          config_value: JSON.stringify(jsonData),
          data_type: "json",
          description: "Test json configuration parameter",
          category: "test",
          is_sensitive: false,
        } satisfies IDiscussionBoardSystemConfiguration.ICreate,
      },
    );
  typia.assert(jsonConfig);
  TestValidator.equals("json config data type", jsonConfig.data_type, "json");
  TestValidator.equals(
    "json config value type",
    typeof jsonConfig.config_value,
    "string",
  );
  // Verify all values are stored as strings
  TestValidator.equals(
    "string value stored as string",
    typeof stringConfig.config_value,
    "string",
  );
  TestValidator.equals(
    "integer value stored as string",
    typeof integerConfig.config_value,
    "string",
  );
  TestValidator.equals(
    "boolean value stored as string",
    typeof booleanConfig.config_value,
    "string",
  );
  TestValidator.equals(
    "json value stored as string",
    typeof jsonConfig.config_value,
    "string",
  );
}
