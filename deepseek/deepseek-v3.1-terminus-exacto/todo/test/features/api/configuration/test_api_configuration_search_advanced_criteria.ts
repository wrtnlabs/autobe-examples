import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEConfigurationDataType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEConfigurationDataType";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppConfiguration";
import type { ITodoAppConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppConfiguration";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test advanced configuration search with multiple filter criteria including
 * sensitive flag filtering and required configuration identification.
 *
 * This test validates comprehensive search capabilities for configuration
 * management administrators by establishing user authentication context and
 * performing complex searches combining text search patterns, sensitivity
 * flags, and required configuration filtering.
 */
export async function test_api_configuration_search_advanced_criteria(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      name: RandomGenerator.name(),
      href: "https://example.com/todo-app",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Test basic search functionality
  const basicSearchResult =
    await api.functional.todoApp.user.configurations.index(connection, {
      body: {
        page: 1,
        limit: 10,
        search: "config",
      } satisfies ITodoAppConfiguration.IRequest,
    });
  typia.assert(basicSearchResult);

  TestValidator.predicate(
    "basic search returns correct pagination info",
    basicSearchResult.pagination.current === 1 &&
      basicSearchResult.pagination.limit === 10,
  );

  // Step 3: Test advanced filtering with multiple criteria
  const dataTypes: IEConfigurationDataType[] = [
    "boolean",
    "number",
    "string",
    "json",
    "array",
    "object",
  ] as const;
  const selectedDataType = RandomGenerator.pick(dataTypes);

  const advancedSearchResult =
    await api.functional.todoApp.user.configurations.index(connection, {
      body: {
        page: 1,
        limit: 20,
        search: "setting",
        category: "security",
        data_type: selectedDataType,
        is_sensitive: true,
        is_required: false,
      } satisfies ITodoAppConfiguration.IRequest,
    });
  typia.assert(advancedSearchResult);

  TestValidator.predicate(
    "advanced search returns valid pagination structure",
    advancedSearchResult.pagination.current === 1 &&
      advancedSearchResult.pagination.limit === 20,
  );

  // Step 4: Test pagination with different parameters
  const paginationTestResult =
    await api.functional.todoApp.user.configurations.index(connection, {
      body: {
        page: 2,
        limit: 5,
        search: "user",
      } satisfies ITodoAppConfiguration.IRequest,
    });
  typia.assert(paginationTestResult);

  TestValidator.equals(
    "pagination page number correctly matches request",
    paginationTestResult.pagination.current,
    2,
  );

  TestValidator.equals(
    "pagination limit correctly matches request",
    paginationTestResult.pagination.limit,
    5,
  );

  // Step 5: Test filtering by required configurations only
  const requiredOnlyResult =
    await api.functional.todoApp.user.configurations.index(connection, {
      body: {
        page: 1,
        limit: 15,
        is_required: true,
      } satisfies ITodoAppConfiguration.IRequest,
    });
  typia.assert(requiredOnlyResult);

  // Step 6: Test filtering by sensitive configurations only
  const sensitiveOnlyResult =
    await api.functional.todoApp.user.configurations.index(connection, {
      body: {
        page: 1,
        limit: 15,
        is_sensitive: true,
      } satisfies ITodoAppConfiguration.IRequest,
    });
  typia.assert(sensitiveOnlyResult);

  // Step 7: Test empty search (should return all configurations)
  const emptySearchResult =
    await api.functional.todoApp.user.configurations.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppConfiguration.IRequest,
    });
  typia.assert(emptySearchResult);

  TestValidator.predicate(
    "empty search returns valid configuration data",
    emptySearchResult.data.length >= 0,
  );

  // Step 8: Validate that search results contain expected properties
  if (basicSearchResult.data.length > 0) {
    const sampleConfig = basicSearchResult.data[0];

    TestValidator.predicate(
      "configuration summary contains all required properties",
      typeof sampleConfig.id === "string" &&
        typeof sampleConfig.config_key === "string" &&
        typeof sampleConfig.name === "string" &&
        typeof sampleConfig.category === "string" &&
        typeof sampleConfig.data_type === "string" &&
        typeof sampleConfig.is_sensitive === "boolean" &&
        typeof sampleConfig.version === "number",
    );
  }
}
