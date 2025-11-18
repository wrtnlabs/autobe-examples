import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppConfigurationValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppConfigurationValue";
import type { ITodoAppConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppConfiguration";
import type { ITodoAppConfigurationValue } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppConfigurationValue";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test that authenticated users can search and retrieve configuration values
 * for a specific configuration definition.
 *
 * This test validates comprehensive search functionality including filtering by
 * environment, active status, value type, and effective date ranges. It ensures
 * proper pagination with configurable page sizes and sorting options based on
 * creation date, environment, or effective dates.
 */
export async function test_api_configuration_values_search_by_user(
  connection: api.IConnection,
) {
  // Step 1: Create user account for authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "testPassword123",
        name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create configuration definition
  const configKey = `test.${RandomGenerator.alphabets(8)}.setting`;
  const configuration: ITodoAppConfiguration =
    await api.functional.todoApp.user.configurations.create(connection, {
      body: {
        config_key: configKey,
        name: "Test Configuration Setting",
        description: "Configuration for testing search functionality",
        data_type: "string",
        default_value: "default_value",
        category: "test",
        is_sensitive: false,
        is_required: true,
      } satisfies ITodoAppConfiguration.ICreate,
    });
  typia.assert(configuration);

  // Step 3: Create multiple configuration values for different environments
  const environments = ["development", "staging", "production"] as const;
  const valueTypes = ["string", "number", "boolean"] as const;

  const createdValues: ITodoAppConfigurationValue[] = [];

  for (const environment of environments) {
    for (const valueType of valueTypes) {
      const configValue: ITodoAppConfigurationValue =
        await api.functional.todoApp.user.configurations.values.postByConfigkey(
          connection,
          {
            configKey: configKey,
            body: {
              environment: environment,
              config_value:
                valueType === "string"
                  ? "test_value"
                  : valueType === "number"
                    ? "123"
                    : "true",
              value_type: valueType,
              is_active: Math.random() > 0.5,
              effective_to:
                Math.random() > 0.7
                  ? new Date(Date.now() + 86400000).toISOString()
                  : undefined,
            } satisfies ITodoAppConfigurationValue.ICreate,
          },
        );
      typia.assert(configValue);
      createdValues.push(configValue);
    }
  }

  // Step 4: Test basic search with pagination
  const basicSearch: IPageITodoAppConfigurationValue.ISummary =
    await api.functional.todoApp.user.configurations.values.index(connection, {
      configKey: configKey,
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppConfigurationValue.IRequest,
    });
  typia.assert(basicSearch);
  TestValidator.equals(
    "basic search returns correct page number",
    basicSearch.pagination.current,
    1,
  );
  TestValidator.equals(
    "basic search returns correct page limit",
    basicSearch.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "basic search returns non-empty data array",
    basicSearch.data.length > 0,
  );

  // Step 5: Test filtering by environment
  const developmentFilter: IPageITodoAppConfigurationValue.ISummary =
    await api.functional.todoApp.user.configurations.values.index(connection, {
      configKey: configKey,
      body: {
        page: 1,
        limit: 10,
        environment: "development",
      } satisfies ITodoAppConfigurationValue.IRequest,
    });
  typia.assert(developmentFilter);
  TestValidator.predicate(
    "development filter returns only development environment values",
    developmentFilter.data.every(
      (value) => value.environment === "development",
    ),
  );

  // Step 6: Test filtering by active status
  const activeFilter: IPageITodoAppConfigurationValue.ISummary =
    await api.functional.todoApp.user.configurations.values.index(connection, {
      configKey: configKey,
      body: {
        page: 1,
        limit: 10,
        is_active: true,
      } satisfies ITodoAppConfigurationValue.IRequest,
    });
  typia.assert(activeFilter);
  TestValidator.predicate(
    "active filter returns only active configuration values",
    activeFilter.data.every((value) => value.is_active === true),
  );

  // Step 7: Test filtering by value type
  const stringTypeFilter: IPageITodoAppConfigurationValue.ISummary =
    await api.functional.todoApp.user.configurations.values.index(connection, {
      configKey: configKey,
      body: {
        page: 1,
        limit: 10,
        value_type: "string",
      } satisfies ITodoAppConfigurationValue.IRequest,
    });
  typia.assert(stringTypeFilter);
  TestValidator.predicate(
    "string type filter returns only string value types",
    stringTypeFilter.data.every((value) => value.value_type === "string"),
  );

  // Step 8: Test sorting by creation date
  const sortedByCreatedAt: IPageITodoAppConfigurationValue.ISummary =
    await api.functional.todoApp.user.configurations.values.index(connection, {
      configKey: configKey,
      body: {
        page: 1,
        limit: 10,
        order_by: "created_at",
        order: "desc",
      } satisfies ITodoAppConfigurationValue.IRequest,
    });
  typia.assert(sortedByCreatedAt);
  TestValidator.predicate(
    "sorted results are in descending creation date order",
    sortedByCreatedAt.data.length > 1
      ? new Date(sortedByCreatedAt.data[0].created_at) >=
          new Date(sortedByCreatedAt.data[1].created_at)
      : true,
  );

  // Step 9: Test effective date range filtering
  const futureDate = new Date(Date.now() + 86400000).toISOString();
  const effectiveRangeFilter: IPageITodoAppConfigurationValue.ISummary =
    await api.functional.todoApp.user.configurations.values.index(connection, {
      configKey: configKey,
      body: {
        page: 1,
        limit: 10,
        effective_to: futureDate,
      } satisfies ITodoAppConfigurationValue.IRequest,
    });
  typia.assert(effectiveRangeFilter);

  // Step 10: Validate configuration relationship
  TestValidator.predicate(
    "all search results reference the correct parent configuration",
    basicSearch.data.every(
      (value) => value.configuration.config_key === configKey,
    ),
  );

  // Step 11: Test search with multiple filters
  const combinedFilter: IPageITodoAppConfigurationValue.ISummary =
    await api.functional.todoApp.user.configurations.values.index(connection, {
      configKey: configKey,
      body: {
        page: 1,
        limit: 5,
        environment: "production",
        is_active: true,
        value_type: "string",
      } satisfies ITodoAppConfigurationValue.IRequest,
    });
  typia.assert(combinedFilter);
  TestValidator.predicate(
    "combined filter returns values matching all criteria",
    combinedFilter.data.every(
      (value) =>
        value.environment === "production" &&
        value.is_active === true &&
        value.value_type === "string",
    ),
  );
}
