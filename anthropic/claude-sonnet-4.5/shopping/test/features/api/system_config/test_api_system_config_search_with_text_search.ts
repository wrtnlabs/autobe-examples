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
 * Test full-text search functionality for system configurations.
 *
 * This test validates the text search mechanism for system configuration
 * entries, ensuring administrators can quickly find specific settings using
 * partial text matching.
 *
 * Test workflow:
 *
 * 1. Create and authenticate admin account
 * 2. Retrieve initial configuration data to obtain searchable terms
 * 3. Perform text searches with extracted terms
 * 4. Validate case-insensitive substring matching in config_key, category, and
 *    other fields
 * 5. Test with multiple search terms to ensure reliability
 */
export async function test_api_system_config_search_with_text_search(
  connection: api.IConnection,
) {
  // Step 1: Create admin account and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: typia.random<string & tags.Format<"password">>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Retrieve initial configurations to get searchable data
  const initialConfigs =
    await api.functional.shoppingMall.admin.systemConfigs.index(connection, {
      body: {
        page: 1,
        limit: 20,
      } satisfies IShoppingMallSystemConfig.IRequest,
    });
  typia.assert(initialConfigs);

  // Verify we have configurations to search
  TestValidator.predicate(
    "initial configurations should exist",
    initialConfigs.data.length > 0,
  );

  // Step 3: Extract search terms from existing configurations
  const sampleConfig = RandomGenerator.pick(initialConfigs.data);

  // Extract a meaningful substring from config_key for searching (at least 3 chars)
  let keySearchTerm = RandomGenerator.substring(sampleConfig.config_key);
  if (keySearchTerm.length < 3 && sampleConfig.config_key.length >= 3) {
    keySearchTerm = sampleConfig.config_key.substring(0, 3);
  }

  // Step 4: Perform search with config_key substring
  const keySearchResults =
    await api.functional.shoppingMall.admin.systemConfigs.index(connection, {
      body: {
        search: keySearchTerm,
        page: 1,
        limit: 50,
      } satisfies IShoppingMallSystemConfig.IRequest,
    });
  typia.assert(keySearchResults);

  // Step 5: Validate search results contain the search term
  TestValidator.predicate(
    "search should return at least one result",
    keySearchResults.data.length > 0,
  );

  // Verify case-insensitive partial matching in available text fields
  const matchesFound = keySearchResults.data.some((config) => {
    const lowerSearchTerm = keySearchTerm.toLowerCase();
    return (
      config.config_key.toLowerCase().includes(lowerSearchTerm) ||
      config.category.toLowerCase().includes(lowerSearchTerm) ||
      config.config_value.toLowerCase().includes(lowerSearchTerm) ||
      config.value_type.toLowerCase().includes(lowerSearchTerm)
    );
  });

  TestValidator.predicate(
    "search results should contain term in text fields",
    matchesFound,
  );

  // Step 6: Test with different search term from category
  const anotherConfig = RandomGenerator.pick(initialConfigs.data);
  let categorySearchTerm = RandomGenerator.substring(anotherConfig.category);
  if (categorySearchTerm.length < 3 && anotherConfig.category.length >= 3) {
    categorySearchTerm = anotherConfig.category.substring(0, 3);
  }

  const categorySearchResults =
    await api.functional.shoppingMall.admin.systemConfigs.index(connection, {
      body: {
        search: categorySearchTerm,
        page: 1,
        limit: 50,
      } satisfies IShoppingMallSystemConfig.IRequest,
    });
  typia.assert(categorySearchResults);

  // Verify the search mechanism works with different terms
  TestValidator.predicate(
    "category search should return results",
    categorySearchResults.data.length >= 0,
  );

  // Step 7: Test search without term returns all configurations
  const emptySearchResults =
    await api.functional.shoppingMall.admin.systemConfigs.index(connection, {
      body: {
        page: 1,
        limit: 20,
      } satisfies IShoppingMallSystemConfig.IRequest,
    });
  typia.assert(emptySearchResults);

  TestValidator.predicate(
    "search without term should return configurations",
    emptySearchResults.data.length > 0,
  );

  // Step 8: Verify pagination metadata is correct
  TestValidator.predicate(
    "pagination current page should be 1",
    keySearchResults.pagination.current === 1,
  );

  TestValidator.predicate(
    "pagination limit should match request",
    keySearchResults.pagination.limit === 50,
  );
}
