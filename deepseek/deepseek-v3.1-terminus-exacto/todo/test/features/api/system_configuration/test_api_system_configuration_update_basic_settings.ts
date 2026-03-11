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

/**
 * Test updating basic system configuration settings with different data types.
 * Verify that the configuration value is properly validated against the specified
 * data type (string, number, boolean, json). Validate that the version number
 * increments correctly and the updated_at timestamp is updated.
 */
export async function test_api_system_configuration_update_basic_settings(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication setup
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(admin);
  // Assume a pre-existing configuration ID for testing
  // In a real test environment, this would be created by a setup script
  const configurationId = typia.random<string & tags.Format<"uuid">>();
  // 2. Test string data type update
  const stringUpdate =
    await api.functional.multiUserTodo.admin.system_configurations.update(
      adminConnection,
      {
        configurationId,
        body: {
          config_value: RandomGenerator.paragraph({ sentences: 3 }),
          data_type: "string",
          scope: "global",
          description: RandomGenerator.paragraph({ sentences: 1 }),
          is_active: true,
        } satisfies IMultiUserTodoSystemConfiguration.IUpdate,
      },
    );
  typia.assert(stringUpdate);
  TestValidator.equals(
    "data_type should be string",
    stringUpdate.data_type,
    "string",
  );
  TestValidator.predicate(
    "version should be at least 1",
    stringUpdate.version >= 1,
  );
  TestValidator.predicate(
    "updated_at should be valid date",
    new Date(stringUpdate.updated_at).getTime() > 0,
  );
  // 3. Test number data type update
  const numberUpdate =
    await api.functional.multiUserTodo.admin.system_configurations.update(
      adminConnection,
      {
        configurationId,
        body: {
          config_value: typia
            .random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
            >()
            .toString(),
          data_type: "number",
          scope: "component",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          is_active: false,
        } satisfies IMultiUserTodoSystemConfiguration.IUpdate,
      },
    );
  typia.assert(numberUpdate);
  TestValidator.equals(
    "data_type should be number",
    numberUpdate.data_type,
    "number",
  );
  TestValidator.equals(
    "version should increment from previous",
    numberUpdate.version,
    stringUpdate.version + 1,
  );
  TestValidator.predicate(
    "updated_at should be newer",
    new Date(numberUpdate.updated_at).getTime() >
      new Date(stringUpdate.updated_at).getTime(),
  );
  // Verify number validation by attempting to parse config_value
  const parsedNumber = Number(numberUpdate.config_value);
  TestValidator.predicate(
    "config_value should be valid number",
    !isNaN(parsedNumber),
  );
  // 4. Test boolean data type update
  const booleanUpdate =
    await api.functional.multiUserTodo.admin.system_configurations.update(
      adminConnection,
      {
        configurationId,
        body: {
          config_value: "true",
          data_type: "boolean",
          scope: "environment",
          description: RandomGenerator.paragraph({ sentences: 1 }),
          is_active: true,
        } satisfies IMultiUserTodoSystemConfiguration.IUpdate,
      },
    );
  typia.assert(booleanUpdate);
  TestValidator.equals(
    "data_type should be boolean",
    booleanUpdate.data_type,
    "boolean",
  );
  TestValidator.equals(
    "config_value should be 'true'",
    booleanUpdate.config_value,
    "true",
  );
  TestValidator.equals(
    "version should increment",
    booleanUpdate.version,
    numberUpdate.version + 1,
  );
  TestValidator.predicate(
    "updated_at should be newer",
    new Date(booleanUpdate.updated_at).getTime() >
      new Date(numberUpdate.updated_at).getTime(),
  );
  // 5. Test json data type update
  const jsonData = {
    nested: {
      stringValue: RandomGenerator.name(),
      numberValue: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
      >(),
      booleanValue: true,
      arrayValue: ArrayUtil.repeat(3, () => RandomGenerator.alphabets(5)),
    },
  };
  const jsonUpdate =
    await api.functional.multiUserTodo.admin.system_configurations.update(
      adminConnection,
      {
        configurationId,
        body: {
          config_value: JSON.stringify(jsonData),
          data_type: "json",
          scope: "global",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          is_active: booleanUpdate.is_active,
        } satisfies IMultiUserTodoSystemConfiguration.IUpdate,
      },
    );
  typia.assert(jsonUpdate);
  TestValidator.equals(
    "data_type should be json",
    jsonUpdate.data_type,
    "json",
  );
  TestValidator.equals(
    "version should increment",
    jsonUpdate.version,
    booleanUpdate.version + 1,
  );
  TestValidator.predicate(
    "updated_at should be newer",
    new Date(jsonUpdate.updated_at).getTime() >
      new Date(booleanUpdate.updated_at).getTime(),
  );
  // Verify JSON is valid
  const parsedJson = JSON.parse(jsonUpdate.config_value);
  TestValidator.predicate(
    "config_value should be valid JSON",
    typeof parsedJson === "object",
  );
  // 6. Validate complete entity structure after all updates
  TestValidator.equals(
    "id should remain constant",
    jsonUpdate.id,
    configurationId,
  );
  TestValidator.predicate(
    "config_key should be present",
    jsonUpdate.config_key.length > 0,
  );
  TestValidator.predicate(
    "description should be present",
    jsonUpdate.description.length > 0,
  );
  TestValidator.predicate(
    "scope should be valid",
    ["global", "component", "environment"].includes(jsonUpdate.scope),
  );
  TestValidator.predicate(
    "created_at should be valid",
    new Date(jsonUpdate.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "updated_at should be after created_at",
    new Date(jsonUpdate.updated_at).getTime() >=
      new Date(jsonUpdate.created_at).getTime(),
  );
}
