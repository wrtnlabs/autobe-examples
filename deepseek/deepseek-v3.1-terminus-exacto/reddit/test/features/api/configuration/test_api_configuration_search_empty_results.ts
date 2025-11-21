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
 * Test configuration search behavior when no results match the criteria.
 *
 * This test validates that empty search results return proper pagination
 * metadata with zero records. It tests edge cases like non-existent categories,
 * invalid data types, and extreme filter combinations to ensure the system
 * handles empty result sets gracefully without errors.
 */
export async function test_api_configuration_search_empty_results(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "ValidPassword123!",
        display_name: "Test Administrator",
        admin_level: "content",
        is_super_admin: false,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Test search with non-existent category
  const nonExistentCategoryResult: IPageICommunityPlatformConfiguration.ISummary =
    await api.functional.communityPlatform.admin.configurations.index(
      connection,
      {
        body: {
          category: "non_existent_category_that_does_not_exist",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(nonExistentCategoryResult);

  TestValidator.equals(
    "non-existent category search should return zero records",
    nonExistentCategoryResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-existent category search should have empty data array",
    nonExistentCategoryResult.data.length,
    0,
  );
  TestValidator.predicate(
    "non-existent category search pagination should be valid",
    nonExistentCategoryResult.pagination.current === 1 &&
      nonExistentCategoryResult.pagination.limit === 10 &&
      nonExistentCategoryResult.pagination.pages === 0,
  );

  // Step 3: Test search with extreme filter combination
  const extremeFilterResult: IPageICommunityPlatformConfiguration.ISummary =
    await api.functional.communityPlatform.admin.configurations.index(
      connection,
      {
        body: {
          category: "another_non_existent_category",
          data_type: "non_existent_data_type",
          is_sensitive: true,
          is_editable: false,
          search: "extremely_specific_search_term_that_wont_match",
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(extremeFilterResult);

  TestValidator.equals(
    "extreme filter combination should return zero records",
    extremeFilterResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "extreme filter combination should have empty data array",
    extremeFilterResult.data.length,
    0,
  );

  // Step 4: Test search with specific data type filter that doesn't exist
  const specificDataTypeResult: IPageICommunityPlatformConfiguration.ISummary =
    await api.functional.communityPlatform.admin.configurations.index(
      connection,
      {
        body: {
          data_type: "imaginary_data_type",
          page: 2,
          limit: 20,
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(specificDataTypeResult);

  TestValidator.equals(
    "specific data type filter should return zero records",
    specificDataTypeResult.pagination.records,
    0,
  );
  TestValidator.predicate(
    "page number should be preserved even with zero results",
    specificDataTypeResult.pagination.current === 2,
  );

  // Step 5: Test search with sensitivity filter on non-existent category
  const sensitivityFilterResult: IPageICommunityPlatformConfiguration.ISummary =
    await api.functional.communityPlatform.admin.configurations.index(
      connection,
      {
        body: {
          is_sensitive: true,
          category: "non_existent_sensitive_category",
          page: 1,
          limit: 15,
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(sensitivityFilterResult);

  TestValidator.equals(
    "sensitivity filter on non-existent category should return zero records",
    sensitivityFilterResult.pagination.records,
    0,
  );
  TestValidator.predicate(
    "limit should be preserved in pagination metadata",
    sensitivityFilterResult.pagination.limit === 15,
  );

  // Step 6: Test search with editability filter on non-existent category
  const editabilityFilterResult: IPageICommunityPlatformConfiguration.ISummary =
    await api.functional.communityPlatform.admin.configurations.index(
      connection,
      {
        body: {
          is_editable: false,
          category: "non_existent_non_editable_category",
          page: 1,
          limit: 25,
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(editabilityFilterResult);

  TestValidator.equals(
    "editability filter on non-existent category should return zero records",
    editabilityFilterResult.pagination.records,
    0,
  );
  TestValidator.predicate(
    "pagination pages should be zero when records are zero",
    editabilityFilterResult.pagination.pages === 0,
  );

  // Step 7: Test search with sorting on empty result set
  const sortedEmptyResult: IPageICommunityPlatformConfiguration.ISummary =
    await api.functional.communityPlatform.admin.configurations.index(
      connection,
      {
        body: {
          category: "non_existent_category_for_sorting",
          sort_by: "key",
          order: "desc",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(sortedEmptyResult);

  TestValidator.equals(
    "sorted search on non-existent category should return zero records",
    sortedEmptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "sorted search should have empty data array",
    sortedEmptyResult.data.length,
    0,
  );

  // Step 8: Validate consistent behavior across all empty result tests
  const allResults = [
    nonExistentCategoryResult,
    extremeFilterResult,
    specificDataTypeResult,
    sensitivityFilterResult,
    editabilityFilterResult,
    sortedEmptyResult,
  ];

  for (const result of allResults) {
    TestValidator.predicate(
      "all empty result sets should have zero records",
      result.pagination.records === 0,
    );
    TestValidator.predicate(
      "all empty result sets should have empty data arrays",
      result.data.length === 0,
    );
    TestValidator.predicate(
      "all empty result sets should have valid pagination structure",
      result.pagination.current >= 1 &&
        result.pagination.limit >= 1 &&
        result.pagination.pages === 0,
    );
  }
}
