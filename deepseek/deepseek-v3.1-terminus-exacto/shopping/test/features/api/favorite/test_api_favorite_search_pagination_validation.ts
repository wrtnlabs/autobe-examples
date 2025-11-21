import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallFavorite";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFavorite";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validates pagination functionality by creating multiple favorite entries and
 * verifying that pagination parameters (page, limit) work correctly. Tests page
 * navigation, record limits, and pagination metadata accuracy.
 */
export async function test_api_favorite_search_pagination_validation(
  connection: api.IConnection,
) {
  // Step 1: Create customer account for authentication
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "testPassword123",
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://shopping-mall.com/register",
      referrer: "https://shopping-mall.com/home",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create multiple favorite entries for pagination testing
  const favoriteCount = 15; // Create enough favorites for multi-page testing
  const createdFavorites: IShoppingMallFavorite[] = [];

  // Note: In a real implementation, we would create actual products first
  // Since product creation API is not available, we'll simulate the scenario
  // by testing pagination with the assumption that favorites exist

  // Create multiple favorite entries using the available API
  for (let i = 0; i < favoriteCount; i++) {
    // Generate a realistic product ID format for testing
    const productId = typia.random<string & tags.Format<"uuid">>();

    const favorite =
      await api.functional.shoppingMall.customer.favorites.create(connection, {
        body: {
          shopping_mall_product_id: productId,
        } satisfies IShoppingMallFavorite.ICreate,
      });
    typia.assert(favorite);
    createdFavorites.push(favorite);
  }

  // Step 3: Test pagination with different parameters

  // Test 1: Default pagination (should return first page with default limit)
  const defaultPage =
    await api.functional.shoppingMall.customer.favorites.index(connection, {
      body: {} satisfies IShoppingMallFavorite.IRequest,
    });
  typia.assert(defaultPage);

  TestValidator.predicate(
    "default page should have pagination metadata",
    typeof defaultPage.pagination === "object",
  );
  TestValidator.predicate(
    "default page should have current page",
    defaultPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "default page should have limit",
    defaultPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "default page should have total records",
    defaultPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "default page should have total pages",
    defaultPage.pagination.pages >= 0,
  );

  // Test 2: Specific page and limit
  const pageSize = 5;
  const specificPage =
    await api.functional.shoppingMall.customer.favorites.index(connection, {
      body: {
        page: 1,
        limit: pageSize,
      } satisfies IShoppingMallFavorite.IRequest,
    });
  typia.assert(specificPage);
  TestValidator.equals(
    "specific page should match requested page",
    specificPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "specific page should match requested limit",
    specificPage.pagination.limit,
    pageSize,
  );

  // Test 3: Maximum limit test
  const maxLimitPage =
    await api.functional.shoppingMall.customer.favorites.index(connection, {
      body: {
        limit: 100, // Maximum allowed limit
      } satisfies IShoppingMallFavorite.IRequest,
    });
  typia.assert(maxLimitPage);
  TestValidator.equals(
    "max limit page should have correct limit",
    maxLimitPage.pagination.limit,
    100,
  );

  // Test 4: Page navigation with different limits
  const smallLimitPage =
    await api.functional.shoppingMall.customer.favorites.index(connection, {
      body: {
        page: 1,
        limit: 3,
      } satisfies IShoppingMallFavorite.IRequest,
    });
  typia.assert(smallLimitPage);
  TestValidator.equals(
    "small limit page should have correct page number",
    smallLimitPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "small limit page should have correct limit",
    smallLimitPage.pagination.limit,
    3,
  );

  // Test 5: Page 2 with medium limit
  const pageTwo = await api.functional.shoppingMall.customer.favorites.index(
    connection,
    {
      body: {
        page: 2,
        limit: 7,
      } satisfies IShoppingMallFavorite.IRequest,
    },
  );
  typia.assert(pageTwo);
  TestValidator.equals(
    "page two should have correct page number",
    pageTwo.pagination.current,
    2,
  );
  TestValidator.equals(
    "page two should have correct limit",
    pageTwo.pagination.limit,
    7,
  );

  // Step 4: Validate pagination metadata calculations
  TestValidator.predicate(
    "total records should be consistent across requests",
    defaultPage.pagination.records === specificPage.pagination.records,
  );

  TestValidator.predicate(
    "total pages calculation should be mathematically correct",
    defaultPage.pagination.pages ===
      Math.ceil(defaultPage.pagination.records / defaultPage.pagination.limit),
  );

  // Step 5: Verify data integrity and structure
  if (defaultPage.data.length > 0) {
    const sampleFavorite = defaultPage.data[0];
    TestValidator.predicate(
      "favorite should have valid ID",
      sampleFavorite.id.length > 0,
    );
    TestValidator.predicate(
      "favorite should have favorited_at timestamp",
      sampleFavorite.favorited_at.length > 0,
    );
    TestValidator.predicate(
      "favorite should have product information",
      typeof sampleFavorite.product === "object",
    );

    if (sampleFavorite.product) {
      TestValidator.predicate(
        "product should have valid ID",
        sampleFavorite.product.id.length > 0,
      );
      TestValidator.predicate(
        "product should have name",
        sampleFavorite.product.name.length > 0,
      );
      TestValidator.predicate(
        "product should have price",
        typeof sampleFavorite.product.price === "number",
      );
      TestValidator.predicate(
        "product should have status",
        sampleFavorite.product.status.length > 0,
      );
      TestValidator.predicate(
        "product should have stock quantity",
        typeof sampleFavorite.product.stock_quantity === "number",
      );
      TestValidator.predicate(
        "product should have category",
        typeof sampleFavorite.product.category === "object",
      );
      TestValidator.predicate(
        "product should have seller",
        typeof sampleFavorite.product.seller === "object",
      );
    }
  }

  // Step 6: Test edge cases

  // Test minimum page value (page 1 is the minimum valid page)
  const minPage = await api.functional.shoppingMall.customer.favorites.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallFavorite.IRequest,
    },
  );
  typia.assert(minPage);
  TestValidator.equals(
    "minimum page should be handled correctly",
    minPage.pagination.current,
    1,
  );

  // Test with search parameter to ensure pagination works with filtering
  const searchPage = await api.functional.shoppingMall.customer.favorites.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
        search: "test",
      } satisfies IShoppingMallFavorite.IRequest,
    },
  );
  typia.assert(searchPage);
  TestValidator.predicate(
    "search with pagination should return valid results",
    searchPage.pagination.current >= 0,
  );
}
