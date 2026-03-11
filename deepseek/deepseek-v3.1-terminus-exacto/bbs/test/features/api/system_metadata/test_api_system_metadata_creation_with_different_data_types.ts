import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardStatusType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusType";
import type { IDiscussionBoardSystemMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemMetadatum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_system_metadata_create } from "../../../generate/generate_random_discussion_board_admin_system_metadata_create";
import { prepare_random_discussion_board_system_metadatum } from "../../../prepare/prepare_random_discussion_board_system_metadatum";

/**
 * Test creation of system metadata entries with various supported data types to validate data_type and value format matching.
 * Administrator authenticates via admin join. Create multiple configurations with different data_type values:
 * boolean (value: 'true'), integer (value: '42'), string (value: 'production_mode'),
 * json (value: '{"enabled": true, "threshold": 100}'), float (value: '3.14159').
 * For each creation, verify the system properly validates that the value format matches the declared data_type
 * and creates the configuration successfully. Test edge cases like JSON parsing validation, numeric format validation,
 * and boolean string conversion.
 */
export async function test_api_system_metadata_creation_with_different_data_types(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Test boolean data type
  const booleanConfig =
    await generate_random_discussion_board_admin_system_metadata_create(
      adminConnection,
      {
        body: {
          name: `test_boolean_${RandomGenerator.alphaNumeric(8)}`,
          value: "true",
          data_type: "boolean",
          scope: "global",
          description: "Test boolean configuration",
        } satisfies IDiscussionBoardSystemMetadatum.ICreate,
      },
    );
  typia.assert(booleanConfig);
  TestValidator.equals("boolean data type", booleanConfig.data_type, "boolean");
  TestValidator.equals("boolean value", booleanConfig.value, "true");
  // Test integer data type
  const integerConfig =
    await generate_random_discussion_board_admin_system_metadata_create(
      adminConnection,
      {
        body: {
          name: `test_integer_${RandomGenerator.alphaNumeric(8)}`,
          value: "42",
          data_type: "integer",
          scope: "global",
          description: "Test integer configuration",
        } satisfies IDiscussionBoardSystemMetadatum.ICreate,
      },
    );
  typia.assert(integerConfig);
  TestValidator.equals("integer data type", integerConfig.data_type, "integer");
  TestValidator.equals("integer value", integerConfig.value, "42");
  // Test string data type
  const stringConfig =
    await generate_random_discussion_board_admin_system_metadata_create(
      adminConnection,
      {
        body: {
          name: `test_string_${RandomGenerator.alphaNumeric(8)}`,
          value: "production_mode",
          data_type: "string",
          scope: "global",
          description: "Test string configuration",
        } satisfies IDiscussionBoardSystemMetadatum.ICreate,
      },
    );
  typia.assert(stringConfig);
  TestValidator.equals("string data type", stringConfig.data_type, "string");
  TestValidator.equals("string value", stringConfig.value, "production_mode");
  // Test json data type
  const jsonConfig =
    await generate_random_discussion_board_admin_system_metadata_create(
      adminConnection,
      {
        body: {
          name: `test_json_${RandomGenerator.alphaNumeric(8)}`,
          value: '{"enabled": true, "threshold": 100}',
          data_type: "json",
          scope: "global",
          description: "Test json configuration",
        } satisfies IDiscussionBoardSystemMetadatum.ICreate,
      },
    );
  typia.assert(jsonConfig);
  TestValidator.equals("json data type", jsonConfig.data_type, "json");
  TestValidator.equals(
    "json value",
    jsonConfig.value,
    '{"enabled": true, "threshold": 100}',
  );
  // Test float data type
  const floatConfig =
    await generate_random_discussion_board_admin_system_metadata_create(
      adminConnection,
      {
        body: {
          name: `test_float_${RandomGenerator.alphaNumeric(8)}`,
          value: "3.14159",
          data_type: "float",
          scope: "global",
          description: "Test float configuration",
        } satisfies IDiscussionBoardSystemMetadatum.ICreate,
      },
    );
  typia.assert(floatConfig);
  TestValidator.equals("float data type", floatConfig.data_type, "float");
  TestValidator.equals("float value", floatConfig.value, "3.14159");
  // Test edge cases: invalid JSON format with json data_type
  await TestValidator.error("invalid JSON format should fail", async () => {
    await generate_random_discussion_board_admin_system_metadata_create(
      adminConnection,
      {
        body: {
          name: `test_invalid_json_${RandomGenerator.alphaNumeric(8)}`,
          value: '{"enabled": true, "threshold": 100', // missing closing brace
          data_type: "json",
          scope: "global",
          description: "Test invalid json configuration",
        } satisfies IDiscussionBoardSystemMetadatum.ICreate,
      },
    );
  });
  // Test edge cases: invalid numeric format with integer data_type
  await TestValidator.error("invalid integer format should fail", async () => {
    await generate_random_discussion_board_admin_system_metadata_create(
      adminConnection,
      {
        body: {
          name: `test_invalid_integer_${RandomGenerator.alphaNumeric(8)}`,
          value: "not_a_number",
          data_type: "integer",
          scope: "global",
          description: "Test invalid integer configuration",
        } satisfies IDiscussionBoardSystemMetadatum.ICreate,
      },
    );
  });
  // Test edge cases: invalid boolean format
  await TestValidator.error("invalid boolean format should fail", async () => {
    await generate_random_discussion_board_admin_system_metadata_create(
      adminConnection,
      {
        body: {
          name: `test_invalid_boolean_${RandomGenerator.alphaNumeric(8)}`,
          value: "maybe", // not a valid boolean string
          data_type: "boolean",
          scope: "global",
          description: "Test invalid boolean configuration",
        } satisfies IDiscussionBoardSystemMetadatum.ICreate,
      },
    );
  });
  // Test business logic validation by ensuring configurations are created successfully
  TestValidator.predicate(
    "all configurations created successfully",
    booleanConfig.id !== integerConfig.id &&
      booleanConfig.id !== stringConfig.id &&
      booleanConfig.id !== jsonConfig.id &&
      booleanConfig.id !== floatConfig.id,
  );
}
