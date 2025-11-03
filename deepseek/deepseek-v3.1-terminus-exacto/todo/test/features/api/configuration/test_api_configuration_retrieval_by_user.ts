import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppConfiguration";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test that authenticated users can retrieve specific configuration settings by
 * their unique configuration key.
 *
 * This test validates the complete workflow of configuration retrieval:
 *
 * 1. User registration and authentication establishment
 * 2. Configuration creation with realistic test data
 * 3. Configuration retrieval using the authenticated connection
 * 4. Validation of returned configuration data against created data
 *
 * The test ensures proper authorization flow and data integrity throughout the
 * process.
 */
export async function test_api_configuration_retrieval_by_user(
  connection: api.IConnection,
) {
  // 1. Create a new user account to establish authentication context
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // 2. Create a configuration setting to retrieve for testing
  const configDataTypes = ["string", "boolean", "number", "json"] as const;
  const configDataType = RandomGenerator.pick(configDataTypes);

  let configValue: string;
  switch (configDataType) {
    case "string":
      configValue = RandomGenerator.paragraph({ sentences: 3 });
      break;
    case "boolean":
      configValue = RandomGenerator.pick(["true", "false"] as const);
      break;
    case "number":
      configValue = typia.random<number & tags.Type<"uint32">>().toString();
      break;
    case "json":
      configValue = JSON.stringify({
        key: RandomGenerator.paragraph({ sentences: 2 }),
        value: typia.random<number & tags.Type<"uint32">>(),
        enabled: RandomGenerator.pick([true, false] as const),
      });
      break;
  }

  const configuration = await api.functional.todoApp.configurations.create(
    connection,
    {
      body: {
        config_key: `test.config.${RandomGenerator.alphaNumeric(8)}`,
        config_value: configValue,
        data_type: configDataType,
        description: "Test configuration for E2E testing",
        status: "active",
      } satisfies ITodoAppConfiguration.ICreate,
    },
  );
  typia.assert(configuration);

  // 3. Retrieve the configuration using the authenticated user's connection
  const retrievedConfiguration =
    await api.functional.todoApp.user.configurations.at(connection, {
      configKey: configuration.config_key,
    });
  typia.assert(retrievedConfiguration);

  // 4. Validate that the retrieved configuration matches the created one
  TestValidator.equals(
    "configuration ID matches",
    retrievedConfiguration.id,
    configuration.id,
  );
  TestValidator.equals(
    "configuration key matches",
    retrievedConfiguration.config_key,
    configuration.config_key,
  );
  TestValidator.equals(
    "configuration value matches",
    retrievedConfiguration.config_value,
    configuration.config_value,
  );
  TestValidator.equals(
    "data type matches",
    retrievedConfiguration.data_type,
    configuration.data_type,
  );
  TestValidator.equals(
    "description matches",
    retrievedConfiguration.description,
    configuration.description,
  );
  TestValidator.equals(
    "status matches",
    retrievedConfiguration.status,
    configuration.status,
  );
}
