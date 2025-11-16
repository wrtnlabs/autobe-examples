import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IConfigurationDataType } from "@ORGANIZATION/PROJECT-api/lib/structures/IConfigurationDataType";
import type { ITodoAppConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppConfiguration";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test that authenticated users can update existing configuration settings with
 * valid update data. The test validates that configuration values can be
 * modified while maintaining data type consistency across boolean, number,
 * string, JSON, and array data types. The test ensures proper validation of
 * updated configuration data and verification that changes are persisted
 * correctly.
 */
export async function test_api_configuration_update_by_user(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account for authentication
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPassword =
    RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }) +
    "!@#123";

  const createdUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        password_hash: typia.random<string>(), // Server will regenerate this
        status: "active" as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } satisfies ITodoAppUser.ICreate,
    });
  typia.assert(createdUser);

  // Step 2: Authenticate the user
  const authenticatedUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        href: "https://example.com/dashboard",
        referrer: "https://example.com",
      } satisfies ITodoAppUser.ICredentials,
    });
  typia.assert(authenticatedUser);
  TestValidator.equals(
    "user ID matches after authentication",
    authenticatedUser.id,
    createdUser.id,
  );

  // Step 3: Test updating configuration with different data types
  const configurationKey =
    "test_feature_" + RandomGenerator.alphabets(8).toLowerCase();

  // Test data type: boolean
  const booleanConfig: ITodoAppConfiguration =
    await api.functional.todoApp.user.configurations.update(connection, {
      configurationKey: configurationKey,
      body: {
        key: configurationKey,
        value: "true",
        description: "Boolean configuration setting for feature flag",
        data_type: "boolean" as IConfigurationDataType,
        category: "feature-flags",
      } satisfies ITodoAppConfiguration.IUpdate,
    });
  typia.assert(booleanConfig);
  TestValidator.equals(
    "configuration key matches",
    booleanConfig.key,
    configurationKey,
  );
  TestValidator.equals(
    "boolean value is stored as string",
    booleanConfig.value,
    "true",
  );
  TestValidator.equals(
    "data type is correct",
    booleanConfig.data_type,
    "boolean",
  );

  // Test data type: number
  const numberConfig: ITodoAppConfiguration =
    await api.functional.todoApp.user.configurations.update(connection, {
      configurationKey: configurationKey,
      body: {
        value: "42",
        description: "Numeric configuration setting for timeout value",
        data_type: "number" as IConfigurationDataType,
        category: "performance",
      } satisfies ITodoAppConfiguration.IUpdate,
    });
  typia.assert(numberConfig);
  TestValidator.equals(
    "number value is stored as string",
    numberConfig.value,
    "42",
  );
  TestValidator.equals(
    "data type updated to number",
    numberConfig.data_type,
    "number",
  );
  TestValidator.equals(
    "key remains unchanged",
    numberConfig.key,
    configurationKey,
  );

  // Test data type: string
  const stringConfig: ITodoAppConfiguration =
    await api.functional.todoApp.user.configurations.update(connection, {
      configurationKey: configurationKey,
      body: {
        value: "test string value",
        description: "String configuration setting for display text",
        data_type: "string" as IConfigurationDataType,
        category: "ui",
      } satisfies ITodoAppConfiguration.IUpdate,
    });
  typia.assert(stringConfig);
  TestValidator.equals(
    "string value is stored correctly",
    stringConfig.value,
    "test string value",
  );
  TestValidator.equals(
    "data type updated to string",
    stringConfig.data_type,
    "string",
  );

  // Test data type: JSON
  const jsonData = JSON.stringify({
    key: "value",
    nested: { array: [1, 2, 3] },
  });
  const jsonConfig: ITodoAppConfiguration =
    await api.functional.todoApp.user.configurations.update(connection, {
      configurationKey: configurationKey,
      body: {
        value: jsonData,
        description: "JSON configuration setting for structured data",
        data_type: "json" as IConfigurationDataType,
        category: "business-rules",
      } satisfies ITodoAppConfiguration.IUpdate,
    });
  typia.assert(jsonConfig);
  TestValidator.equals(
    "JSON value is stored as string",
    jsonConfig.value,
    jsonData,
  );
  TestValidator.equals(
    "data type updated to json",
    jsonConfig.data_type,
    "json",
  );

  // Test data type: array
  const arrayData = JSON.stringify(["item1", "item2", "item3"]);
  const arrayConfig: ITodoAppConfiguration =
    await api.functional.todoApp.user.configurations.update(connection, {
      configurationKey: configurationKey,
      body: {
        value: arrayData,
        description: "Array configuration setting for list data",
        data_type: "array" as IConfigurationDataType,
        category: "data",
      } satisfies ITodoAppConfiguration.IUpdate,
    });
  typia.assert(arrayConfig);
  TestValidator.equals(
    "array value is stored as string",
    arrayConfig.value,
    arrayData,
  );
  TestValidator.equals(
    "data type updated to array",
    arrayConfig.data_type,
    "array",
  );

  // Test partial updates - only updating description
  const partialUpdateConfig: ITodoAppConfiguration =
    await api.functional.todoApp.user.configurations.update(connection, {
      configurationKey: configurationKey,
      body: {
        description: "Updated description without changing value or data type",
      } satisfies ITodoAppConfiguration.IUpdate,
    });
  typia.assert(partialUpdateConfig);
  TestValidator.equals(
    "value remains unchanged during partial update",
    partialUpdateConfig.value,
    arrayData,
  );
  TestValidator.equals(
    "data type remains unchanged",
    partialUpdateConfig.data_type,
    "array",
  );
  TestValidator.equals(
    "description was updated",
    partialUpdateConfig.description,
    "Updated description without changing value or data type",
  );

  // Verify that updated_at timestamp changes with each update
  const initialTime = new Date(createdUser.created_at).getTime();
  const booleanTime = new Date(booleanConfig.updated_at).getTime();
  const numberTime = new Date(numberConfig.updated_at).getTime();
  const stringTime = new Date(stringConfig.updated_at).getTime();
  const jsonTime = new Date(jsonConfig.updated_at).getTime();
  const arrayTime = new Date(arrayConfig.updated_at).getTime();
  const partialTime = new Date(partialUpdateConfig.updated_at).getTime();

  TestValidator.predicate(
    "created_at is before first update",
    initialTime < booleanTime,
  );
  TestValidator.predicate(
    "updates progress in chronological order",
    booleanTime < numberTime &&
      numberTime < stringTime &&
      stringTime < jsonTime &&
      jsonTime < arrayTime &&
      arrayTime < partialTime,
  );
}
