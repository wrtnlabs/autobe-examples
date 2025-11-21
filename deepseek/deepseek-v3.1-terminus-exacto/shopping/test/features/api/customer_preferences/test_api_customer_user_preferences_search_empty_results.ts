import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallUserPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallUserPreference";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallUserPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserPreference";

export async function test_api_customer_user_preferences_search_empty_results(
  connection: api.IConnection,
) {
  // Step 1: Create customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "testPassword123",
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create test preferences with specific characteristics
  const preferenceTypes = ["notification", "display", "privacy"] as const;
  const categories = ["communication", "appearance", "security"] as const;

  const createdPreferences: IShoppingMallUserPreference[] = [];

  for (let i = 0; i < 3; i++) {
    const preference =
      await api.functional.shoppingMall.customer.userPreferences.post(
        connection,
        {
          body: {
            preference_type: preferenceTypes[i],
            preference_key: `test_key_${i}`,
            preference_value: `test_value_${i}`,
            category: categories[i],
          } satisfies IShoppingMallUserPreference.ICreate,
        },
      );
    typia.assert(preference);
    createdPreferences.push(preference);
  }

  // Step 3: Test search with non-existent preference type
  const nonExistentTypeSearch =
    await api.functional.shoppingMall.customer.userPreferences.index(
      connection,
      {
        body: {
          preference_type: "non_existent_type",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallUserPreference.IRequest,
      },
    );
  typia.assert(nonExistentTypeSearch);
  TestValidator.equals(
    "empty results for non-existent type",
    nonExistentTypeSearch.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records count for non-existent type",
    nonExistentTypeSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages count for non-existent type",
    nonExistentTypeSearch.pagination.pages,
    0,
  );

  // Step 4: Test search with non-existent preference key
  const nonExistentKeySearch =
    await api.functional.shoppingMall.customer.userPreferences.index(
      connection,
      {
        body: {
          preference_key: "non_existent_key",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallUserPreference.IRequest,
      },
    );
  typia.assert(nonExistentKeySearch);
  TestValidator.equals(
    "empty results for non-existent key",
    nonExistentKeySearch.data.length,
    0,
  );

  // Step 5: Test search with non-existent category
  const nonExistentCategorySearch =
    await api.functional.shoppingMall.customer.userPreferences.index(
      connection,
      {
        body: {
          category: "non_existent_category",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallUserPreference.IRequest,
      },
    );
  typia.assert(nonExistentCategorySearch);
  TestValidator.equals(
    "empty results for non-existent category",
    nonExistentCategorySearch.data.length,
    0,
  );

  // Step 6: Test search with date range that excludes all preferences
  const futureDate = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
  const futureDateSearch =
    await api.functional.shoppingMall.customer.userPreferences.index(
      connection,
      {
        body: {
          created_at_start: futureDate,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallUserPreference.IRequest,
      },
    );
  typia.assert(futureDateSearch);
  TestValidator.equals(
    "empty results for future date range",
    futureDateSearch.data.length,
    0,
  );

  // Step 7: Test search with specific value that doesn't match
  const specificValueSearch =
    await api.functional.shoppingMall.customer.userPreferences.index(
      connection,
      {
        body: {
          preference_value: "completely_different_value",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallUserPreference.IRequest,
      },
    );
  typia.assert(specificValueSearch);
  TestValidator.equals(
    "empty results for non-matching value",
    specificValueSearch.data.length,
    0,
  );

  // Step 8: Test search with combination of non-matching criteria
  const combinedSearch =
    await api.functional.shoppingMall.customer.userPreferences.index(
      connection,
      {
        body: {
          preference_type: "non_existent_type",
          preference_key: "non_existent_key",
          category: "non_existent_category",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallUserPreference.IRequest,
      },
    );
  typia.assert(combinedSearch);
  TestValidator.equals(
    "empty results for combined non-matching criteria",
    combinedSearch.data.length,
    0,
  );

  // Step 9: Verify pagination metadata is correct for empty results
  TestValidator.equals(
    "current page should be 1",
    combinedSearch.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should be respected",
    combinedSearch.pagination.limit,
    10,
  );
  TestValidator.equals(
    "total records should be 0",
    combinedSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "total pages should be 0",
    combinedSearch.pagination.pages,
    0,
  );
}
