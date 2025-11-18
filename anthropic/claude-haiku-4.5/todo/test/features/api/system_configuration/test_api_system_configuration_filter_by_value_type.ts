import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListSystemConfiguration";
import type { ITodoListSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfig";
import type { ITodoListSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfiguration";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test filtering system configurations by specific value_type.
 *
 * This test validates the configuration filtering functionality by:
 *
 * 1. Authenticating as a user
 * 2. Creating system configuration entries with all supported value types (string,
 *    integer, boolean, float)
 * 3. Filtering configurations by each value_type individually
 * 4. Validating that only matching entries are returned
 * 5. Confirming pagination correctly reflects filtered results
 *
 * The test ensures the filtering API correctly isolates entries by type and
 * that pagination metadata accurately represents the filtered dataset.
 */
export async function test_api_system_configuration_filter_by_value_type(
  connection: api.IConnection,
) {
  // Step 1: Authenticate user
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(10),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create configuration entries with all value_type values
  const stringConfig: ITodoListSystemConfig =
    await api.functional.todoList.systemConfigurations.create(connection, {
      body: {
        config_key: `deployment_environment_${RandomGenerator.alphaNumeric(8)}`,
        config_value: "production",
        value_type: "string",
        description: "Deployment environment setting",
      } satisfies ITodoListSystemConfig.ICreate,
    });
  typia.assert(stringConfig);

  const integerConfig: ITodoListSystemConfig =
    await api.functional.todoList.systemConfigurations.create(connection, {
      body: {
        config_key: `max_todos_per_user_${RandomGenerator.alphaNumeric(8)}`,
        config_value: "10000",
        value_type: "integer",
        description: "Maximum todos per user",
      } satisfies ITodoListSystemConfig.ICreate,
    });
  typia.assert(integerConfig);

  const booleanConfig: ITodoListSystemConfig =
    await api.functional.todoList.systemConfigurations.create(connection, {
      body: {
        config_key: `enable_feature_xyz_${RandomGenerator.alphaNumeric(8)}`,
        config_value: "true",
        value_type: "boolean",
        description: "Feature flag for XYZ feature",
      } satisfies ITodoListSystemConfig.ICreate,
    });
  typia.assert(booleanConfig);

  const floatConfig: ITodoListSystemConfig =
    await api.functional.todoList.systemConfigurations.create(connection, {
      body: {
        config_key: `discount_rate_${RandomGenerator.alphaNumeric(8)}`,
        config_value: "0.15",
        value_type: "float",
        description: "Default discount rate",
      } satisfies ITodoListSystemConfig.ICreate,
    });
  typia.assert(floatConfig);

  // Step 3: Test filtering by each value_type
  const valueTypes: Array<"string" | "integer" | "boolean" | "float"> = [
    "string",
    "integer",
    "boolean",
    "float",
  ];

  for (const valueType of valueTypes) {
    const filteredResult: IPageITodoListSystemConfiguration =
      await api.functional.todoList.user.systemConfigurations.index(
        connection,
        {
          body: {
            page: 1,
            limit: 100,
            value_type: valueType,
          } satisfies ITodoListSystemConfiguration.IRequest,
        },
      );
    typia.assert(filteredResult);

    // Verify all returned entries match the requested value_type
    TestValidator.predicate(
      `all entries for value_type ${valueType} should match requested type`,
      () =>
        filteredResult.data.every((config) => config.value_type === valueType),
    );

    // Verify pagination information is correct
    TestValidator.predicate(
      `pagination total records should match data length for ${valueType}`,
      () => filteredResult.pagination.records >= filteredResult.data.length,
    );

    TestValidator.predicate(
      `current page should be 1 for ${valueType} filter`,
      filteredResult.pagination.current === 1,
    );

    // Verify the specific created config is in the results
    const foundConfig = filteredResult.data.find(
      (config) =>
        (valueType === "string" && config.id === stringConfig.id) ||
        (valueType === "integer" && config.id === integerConfig.id) ||
        (valueType === "boolean" && config.id === booleanConfig.id) ||
        (valueType === "float" && config.id === floatConfig.id),
    );

    TestValidator.predicate(
      `created ${valueType} configuration should be found in filtered results`,
      foundConfig !== undefined,
    );
  }

  // Step 4: Validate that filtering prevents cross-type results
  const stringFilterResult: IPageITodoListSystemConfiguration =
    await api.functional.todoList.user.systemConfigurations.index(connection, {
      body: {
        page: 1,
        limit: 100,
        value_type: "string",
      } satisfies ITodoListSystemConfiguration.IRequest,
    });
  typia.assert(stringFilterResult);

  TestValidator.predicate(
    "string filter should not contain integer type entries",
    () =>
      !stringFilterResult.data.some(
        (config) => config.value_type === "integer",
      ),
  );

  TestValidator.predicate(
    "string filter should not contain boolean type entries",
    () =>
      !stringFilterResult.data.some(
        (config) => config.value_type === "boolean",
      ),
  );

  TestValidator.predicate(
    "string filter should not contain float type entries",
    () =>
      !stringFilterResult.data.some((config) => config.value_type === "float"),
  );

  // Step 5: Verify pagination limit parameter works correctly
  const limitedResult: IPageITodoListSystemConfiguration =
    await api.functional.todoList.user.systemConfigurations.index(connection, {
      body: {
        page: 1,
        limit: 1,
        value_type: "string",
      } satisfies ITodoListSystemConfiguration.IRequest,
    });
  typia.assert(limitedResult);

  TestValidator.predicate(
    "returned data should not exceed specified limit",
    limitedResult.data.length <= 1,
  );

  TestValidator.predicate(
    "pagination limit should match requested limit",
    limitedResult.pagination.limit === 1,
  );
}
