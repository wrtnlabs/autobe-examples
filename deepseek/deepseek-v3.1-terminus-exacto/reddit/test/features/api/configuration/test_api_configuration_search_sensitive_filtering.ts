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
 * Test security filtering for sensitive configuration values during search
 * operations.
 *
 * This comprehensive E2E test validates that administrators can search
 * configurations with various sensitivity and editability filters while
 * ensuring that summary views properly protect actual values. The test creates
 * multiple configuration entries with different security characteristics and
 * verifies that the search API correctly handles access control and value
 * protection.
 */
export async function test_api_configuration_search_sensitive_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create test configurations with different sensitivity/editability combinations
  const testConfigurations: ICommunityPlatformConfiguration[] = [];

  // Sensitive editable configuration (e.g., API key)
  const sensitiveEditableConfig =
    await api.functional.communityPlatform.admin.configurations.create(
      connection,
      {
        body: {
          key: `api.key.${RandomGenerator.alphaNumeric(8)}`,
          value: "sensitive-api-key-value",
          data_type: "string",
          description: "API key for external service integration",
          category: "security",
          is_sensitive: true,
          is_editable: true,
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(sensitiveEditableConfig);
  testConfigurations.push(sensitiveEditableConfig);

  // Sensitive non-editable configuration (e.g., system default)
  const sensitiveNonEditableConfig =
    await api.functional.communityPlatform.admin.configurations.create(
      connection,
      {
        body: {
          key: `system.default.${RandomGenerator.alphaNumeric(8)}`,
          value: "protected-system-value",
          data_type: "string",
          description: "System default configuration (protected)",
          category: "system",
          is_sensitive: true,
          is_editable: false,
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(sensitiveNonEditableConfig);
  testConfigurations.push(sensitiveNonEditableConfig);

  // Non-sensitive editable configuration (e.g., feature flag)
  const nonSensitiveEditableConfig =
    await api.functional.communityPlatform.admin.configurations.create(
      connection,
      {
        body: {
          key: `feature.flag.${RandomGenerator.alphaNumeric(8)}`,
          value: "enabled",
          data_type: "string",
          description: "Feature flag for new functionality",
          category: "features",
          is_sensitive: false,
          is_editable: true,
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(nonSensitiveEditableConfig);
  testConfigurations.push(nonSensitiveEditableConfig);

  // Non-sensitive non-editable configuration (e.g., read-only setting)
  const nonSensitiveNonEditableConfig =
    await api.functional.communityPlatform.admin.configurations.create(
      connection,
      {
        body: {
          key: `readonly.setting.${RandomGenerator.alphaNumeric(8)}`,
          value: "readonly-value",
          data_type: "string",
          description: "Read-only configuration setting",
          category: "system",
          is_sensitive: false,
          is_editable: false,
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(nonSensitiveNonEditableConfig);
  testConfigurations.push(nonSensitiveNonEditableConfig);

  // Step 3: Test search without filters (baseline)
  const allConfigsResult =
    await api.functional.communityPlatform.admin.configurations.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(allConfigsResult);
  TestValidator.predicate(
    "search should return paginated results",
    allConfigsResult.pagination.records >= testConfigurations.length,
  );

  // Step 4: Test filtering by sensitivity status
  const sensitiveConfigsResult =
    await api.functional.communityPlatform.admin.configurations.index(
      connection,
      {
        body: {
          is_sensitive: true,
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(sensitiveConfigsResult);
  TestValidator.predicate(
    "sensitive filter should return configurations",
    sensitiveConfigsResult.data.length > 0,
  );

  const nonSensitiveConfigsResult =
    await api.functional.communityPlatform.admin.configurations.index(
      connection,
      {
        body: {
          is_sensitive: false,
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(nonSensitiveConfigsResult);
  TestValidator.predicate(
    "non-sensitive filter should return configurations",
    nonSensitiveConfigsResult.data.length > 0,
  );

  // Step 5: Test filtering by editability status
  const editableConfigsResult =
    await api.functional.communityPlatform.admin.configurations.index(
      connection,
      {
        body: {
          is_editable: true,
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(editableConfigsResult);
  TestValidator.predicate(
    "editable filter should return configurations",
    editableConfigsResult.data.length > 0,
  );

  const nonEditableConfigsResult =
    await api.functional.communityPlatform.admin.configurations.index(
      connection,
      {
        body: {
          is_editable: false,
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(nonEditableConfigsResult);
  TestValidator.predicate(
    "non-editable filter should return configurations",
    nonEditableConfigsResult.data.length > 0,
  );

  // Step 6: Test combined filtering
  const sensitiveEditableConfigsResult =
    await api.functional.communityPlatform.admin.configurations.index(
      connection,
      {
        body: {
          is_sensitive: true,
          is_editable: true,
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(sensitiveEditableConfigsResult);

  const sensitiveNonEditableConfigsResult =
    await api.functional.communityPlatform.admin.configurations.index(
      connection,
      {
        body: {
          is_sensitive: true,
          is_editable: false,
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(sensitiveNonEditableConfigsResult);

  // Step 7: Verify value protection in search results
  // Check that sensitive configurations in search results have protected values
  const sensitiveConfigInResults = sensitiveConfigsResult.data.find(
    (config) =>
      config.id === sensitiveEditableConfig.id ||
      config.id === sensitiveNonEditableConfig.id,
  );

  if (sensitiveConfigInResults) {
    TestValidator.notEquals(
      "sensitive configuration value should not expose original value",
      sensitiveConfigInResults.value,
      "sensitive-api-key-value",
    );
    TestValidator.notEquals(
      "sensitive configuration value should not expose original value",
      sensitiveConfigInResults.value,
      "protected-system-value",
    );
  }

  // Check that non-sensitive configurations in search results show actual values
  const nonSensitiveConfigInResults = nonSensitiveConfigsResult.data.find(
    (config) =>
      config.id === nonSensitiveEditableConfig.id ||
      config.id === nonSensitiveNonEditableConfig.id,
  );

  if (nonSensitiveConfigInResults) {
    TestValidator.predicate(
      "non-sensitive configuration should show actual value",
      nonSensitiveConfigInResults.value === "enabled" ||
        nonSensitiveConfigInResults.value === "readonly-value",
    );
  }

  // Step 8: Test search functionality with text search
  const searchResults =
    await api.functional.communityPlatform.admin.configurations.index(
      connection,
      {
        body: {
          search: "api",
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(searchResults);
  TestValidator.predicate(
    "text search should return relevant results",
    searchResults.data.length > 0,
  );

  // Step 9: Test category filtering
  const securityCategoryResults =
    await api.functional.communityPlatform.admin.configurations.index(
      connection,
      {
        body: {
          category: "security",
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(securityCategoryResults);

  const systemCategoryResults =
    await api.functional.communityPlatform.admin.configurations.index(
      connection,
      {
        body: {
          category: "system",
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(systemCategoryResults);

  // Step 10: Validate pagination metadata
  TestValidator.predicate(
    "pagination should have valid current page",
    allConfigsResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination should have valid limit",
    allConfigsResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination should have valid record count",
    allConfigsResult.pagination.records >= testConfigurations.length,
  );
  TestValidator.predicate(
    "pagination should calculate total pages correctly",
    allConfigsResult.pagination.pages ===
      Math.ceil(
        allConfigsResult.pagination.records / allConfigsResult.pagination.limit,
      ),
  );
}
