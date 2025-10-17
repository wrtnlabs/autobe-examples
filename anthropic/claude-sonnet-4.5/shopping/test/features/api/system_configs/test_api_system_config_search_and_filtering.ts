import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSystemConfig";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfig";

/**
 * Test comprehensive system configuration search and filtering capabilities.
 *
 * This test validates that administrators can efficiently discover and manage
 * platform-wide configuration settings through advanced search features. The
 * test verifies admin authentication, configuration creation with varied
 * properties, paginated search results, and proper response structure with
 * complete metadata.
 *
 * Test workflow:
 *
 * 1. Authenticate as admin user
 * 2. Create multiple system configuration entries with different properties
 * 3. Test basic pagination without filters
 * 4. Validate search with pagination parameters
 * 5. Verify response includes complete configuration metadata
 */
export async function test_api_system_config_search_and_filtering(
  connection: api.IConnection,
) {
  // Step 1: Admin authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        role_level: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create multiple system configuration entries with varied properties
  const configCount = 10;
  const createdConfigs: IShoppingMallSystemConfig[] = await ArrayUtil.asyncMap(
    ArrayUtil.repeat(configCount, (index) => index),
    async (index) => {
      const config =
        await api.functional.shoppingMall.admin.systemConfigs.create(
          connection,
          {
            body: {
              config_key: `test.config.key.${index}.${RandomGenerator.alphaNumeric(6)}`,
              config_value: RandomGenerator.alphaNumeric(20),
            } satisfies IShoppingMallSystemConfig.ICreate,
          },
        );
      typia.assert(config);
      return config;
    },
  );

  TestValidator.equals(
    "created configs count matches expected",
    createdConfigs.length,
    configCount,
  );

  // Step 3: Test basic pagination - retrieve all configurations without filters
  const allConfigsPage1: IPageIShoppingMallSystemConfig =
    await api.functional.shoppingMall.admin.systemConfigs.index(connection, {
      body: {
        page: 1,
        limit: 5,
      } satisfies IShoppingMallSystemConfig.IRequest,
    });
  typia.assert(allConfigsPage1);

  TestValidator.predicate(
    "pagination returns data",
    allConfigsPage1.data.length > 0,
  );

  TestValidator.predicate(
    "pagination current page is non-negative",
    allConfigsPage1.pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination limit is positive",
    allConfigsPage1.pagination.limit > 0,
  );

  TestValidator.predicate(
    "pagination records includes created configs",
    allConfigsPage1.pagination.records >= createdConfigs.length,
  );

  TestValidator.predicate(
    "pagination pages is non-negative",
    allConfigsPage1.pagination.pages >= 0,
  );

  // Step 4: Validate search with different pagination parameters
  const page2Result: IPageIShoppingMallSystemConfig =
    await api.functional.shoppingMall.admin.systemConfigs.index(connection, {
      body: {
        page: 2,
        limit: 3,
      } satisfies IShoppingMallSystemConfig.IRequest,
    });
  typia.assert(page2Result);

  TestValidator.equals(
    "page 2 current page is correct",
    page2Result.pagination.current,
    2,
  );

  TestValidator.equals(
    "page 2 limit is correct",
    page2Result.pagination.limit,
    3,
  );

  // Step 5: Verify response includes complete configuration metadata
  const sampleConfig = allConfigsPage1.data[0];
  typia.assert(sampleConfig);

  TestValidator.predicate(
    "config has non-empty id",
    sampleConfig.id.length > 0,
  );

  TestValidator.predicate(
    "config has non-empty key",
    sampleConfig.config_key.length > 0,
  );

  TestValidator.predicate(
    "config has non-empty value",
    sampleConfig.config_value.length > 0,
  );

  // Verify that our created configs can be found in the results
  const allPages: IShoppingMallSystemConfig[] = [...allConfigsPage1.data];
  let currentPage = 2;
  const maxPages = 100;

  while (
    allPages.length < allConfigsPage1.pagination.records &&
    currentPage <= allConfigsPage1.pagination.pages &&
    currentPage <= maxPages
  ) {
    const nextPage =
      await api.functional.shoppingMall.admin.systemConfigs.index(connection, {
        body: {
          page: currentPage,
          limit: 5,
        } satisfies IShoppingMallSystemConfig.IRequest,
      });
    typia.assert(nextPage);
    allPages.push(...nextPage.data);
    currentPage++;
  }

  const foundConfigs = createdConfigs.filter((created) =>
    allPages.some((retrieved) => retrieved.id === created.id),
  );

  TestValidator.predicate(
    "all created configs can be found in search results",
    foundConfigs.length === createdConfigs.length,
  );
}
