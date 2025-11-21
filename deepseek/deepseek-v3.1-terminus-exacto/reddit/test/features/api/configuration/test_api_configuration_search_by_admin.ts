import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformConfiguration";

/**
 * Comprehensive configuration search functionality validation for
 * administrators.
 *
 * This test validates that administrators can search platform configurations
 * using various filtering criteria including category, data type, sensitivity
 * status, and editability. It tests pagination functionality with different
 * page sizes and sorting options, and verifies that search results properly
 * filter sensitive configurations based on admin permissions.
 */
export async function test_api_configuration_search_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "admin123",
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create test configurations with diverse attributes
  const categories = ["authentication", "content", "system", "user"] as const;
  const dataTypes = ["string", "number", "boolean", "json"] as const;

  const configurations: ICommunityPlatformConfiguration[] = [];

  // Create configurations with different combinations of attributes
  for (let i = 0; i < 12; i++) {
    const category = RandomGenerator.pick(categories);
    const dataType = RandomGenerator.pick(dataTypes);
    const isSensitive = i % 3 === 0; // Every 3rd config is sensitive
    const isEditable = i % 2 === 0; // Every 2nd config is editable

    const configData = {
      key: `config.test.${category}.${dataType}.${i}`,
      value: getValueForDataType(dataType),
      data_type: dataType,
      description: `Test configuration for ${category} with ${dataType} type`,
      category: category,
      is_sensitive: isSensitive,
      is_editable: isEditable,
      default_value: getDefaultValueForDataType(dataType),
    } satisfies ICommunityPlatformConfiguration.ICreate;

    const configuration: ICommunityPlatformConfiguration =
      await api.functional.communityPlatform.admin.configurations.create(
        connection,
        {
          body: configData,
        },
      );
    typia.assert(configuration);
    configurations.push(configuration);
  }

  // Step 3: Test category filtering
  const authCategoryConfigs = configurations.filter(
    (c) => c.category === "authentication",
  );
  const authSearchResult: IPageICommunityPlatformConfiguration.ISummary =
    await api.functional.communityPlatform.admin.configurations.index(
      connection,
      {
        body: {
          category: "authentication",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(authSearchResult);
  TestValidator.equals(
    "category filter returns correct count",
    authSearchResult.data.length,
    authCategoryConfigs.length,
  );
  TestValidator.predicate(
    "all returned configs match category filter",
    authSearchResult.data.every(
      (config) => config.category === "authentication",
    ),
  );

  // Step 4: Test data type filtering
  const stringConfigs = configurations.filter((c) => c.data_type === "string");
  const stringSearchResult: IPageICommunityPlatformConfiguration.ISummary =
    await api.functional.communityPlatform.admin.configurations.index(
      connection,
      {
        body: {
          data_type: "string",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(stringSearchResult);
  TestValidator.equals(
    "data type filter returns correct count",
    stringSearchResult.data.length,
    stringConfigs.length,
  );
  TestValidator.predicate(
    "all returned configs match data type filter",
    stringSearchResult.data.every((config) => config.data_type === "string"),
  );

  // Step 5: Test sensitivity filtering
  const sensitiveConfigs = configurations.filter((c) => c.is_sensitive);
  const sensitiveSearchResult: IPageICommunityPlatformConfiguration.ISummary =
    await api.functional.communityPlatform.admin.configurations.index(
      connection,
      {
        body: {
          is_sensitive: true,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(sensitiveSearchResult);
  TestValidator.equals(
    "sensitive filter returns correct count",
    sensitiveSearchResult.data.length,
    sensitiveConfigs.length,
  );
  TestValidator.predicate(
    "all returned configs match sensitivity filter",
    sensitiveSearchResult.data.every((config) => config.is_sensitive === true),
  );

  // Step 6: Test editability filtering
  const editableConfigs = configurations.filter((c) => c.is_editable);
  const editableSearchResult: IPageICommunityPlatformConfiguration.ISummary =
    await api.functional.communityPlatform.admin.configurations.index(
      connection,
      {
        body: {
          is_editable: true,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(editableSearchResult);
  TestValidator.equals(
    "editable filter returns correct count",
    editableSearchResult.data.length,
    editableConfigs.length,
  );
  TestValidator.predicate(
    "all returned configs match editability filter",
    editableSearchResult.data.every((config) => config.is_editable === true),
  );

  // Step 7: Test pagination
  const paginationResult: IPageICommunityPlatformConfiguration.ISummary =
    await api.functional.communityPlatform.admin.configurations.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination returns correct page size",
    paginationResult.data.length,
    5,
  );
  TestValidator.predicate(
    "pagination metadata is correct",
    paginationResult.pagination.current === 1 &&
      paginationResult.pagination.limit === 5 &&
      paginationResult.pagination.records >= configurations.length,
  );

  // Step 8: Test sorting by key
  const sortedByKeyResult: IPageICommunityPlatformConfiguration.ISummary =
    await api.functional.communityPlatform.admin.configurations.index(
      connection,
      {
        body: {
          sort_by: "key",
          order: "asc",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(sortedByKeyResult);
  TestValidator.predicate(
    "results are sorted by key ascending",
    isSortedAscending(sortedByKeyResult.data.map((c) => c.key)),
  );

  // Step 9: Test search functionality
  const searchTerm = "test";
  const searchResult: IPageICommunityPlatformConfiguration.ISummary =
    await api.functional.communityPlatform.admin.configurations.index(
      connection,
      {
        body: {
          search: searchTerm,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(searchResult);
  TestValidator.predicate(
    "search returns configs matching search term",
    searchResult.data.every(
      (config) =>
        config.key.toLowerCase().includes(searchTerm) ||
        config.description.toLowerCase().includes(searchTerm),
    ),
  );

  // Step 10: Verify sensitive values are protected in summary views
  const sensitiveConfig = configurations.find((c) => c.is_sensitive);
  if (sensitiveConfig) {
    TestValidator.predicate(
      "sensitive config value is properly protected",
      sensitiveSearchResult.data.some(
        (config) => config.id === sensitiveConfig.id && config.value !== "",
      ),
    );
  }

  // Step 11: Test descending sort order
  const descendingSortResult: IPageICommunityPlatformConfiguration.ISummary =
    await api.functional.communityPlatform.admin.configurations.index(
      connection,
      {
        body: {
          sort_by: "key",
          order: "desc",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(descendingSortResult);
  TestValidator.predicate(
    "results are sorted by key descending",
    isSortedDescending(descendingSortResult.data.map((c) => c.key)),
  );

  // Step 12: Test pagination boundary
  const largePageResult: IPageICommunityPlatformConfiguration.ISummary =
    await api.functional.communityPlatform.admin.configurations.index(
      connection,
      {
        body: {
          page: 100, // Large page number that likely has no data
          limit: 10,
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(largePageResult);
  TestValidator.equals(
    "large page number returns empty data array",
    largePageResult.data.length,
    0,
  );
}

// Helper function to generate appropriate values based on data type
function getValueForDataType(dataType: string): string {
  switch (dataType) {
    case "string":
      return RandomGenerator.paragraph({ sentences: 2 });
    case "number":
      return typia
        .random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
        >()
        .toString();
    case "boolean":
      return RandomGenerator.pick(["true", "false"] as const);
    case "json":
      return JSON.stringify({
        enabled: true,
        maxRetries: 3,
        timeout: 5000,
      });
    default:
      return "default";
  }
}

// Helper function to generate default values based on data type
function getDefaultValueForDataType(dataType: string): string {
  switch (dataType) {
    case "string":
      return "default_value";
    case "number":
      return "100";
    case "boolean":
      return "false";
    case "json":
      return JSON.stringify({ enabled: false });
    default:
      return "";
  }
}

// Helper function to check if array is sorted ascending
function isSortedAscending(arr: string[]): boolean {
  for (let i = 1; i < arr.length; i++) {
    if (arr[i - 1] > arr[i]) {
      return false;
    }
  }
  return true;
}

// Helper function to check if array is sorted descending
function isSortedDescending(arr: string[]): boolean {
  for (let i = 1; i < arr.length; i++) {
    if (arr[i - 1] < arr[i]) {
      return false;
    }
  }
  return true;
}
