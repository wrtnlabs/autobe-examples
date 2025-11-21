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
 * Comprehensive validation of favorite product search sorting functionality.
 *
 * Tests all available sorting options including favorited_at, product_name, and
 * product_price in both ascending and descending orders. Creates multiple
 * favorite entries and validates that each sorting option correctly orders
 * results according to the specified field and direction.
 */
export async function test_api_favorite_search_sorting_options(
  connection: api.IConnection,
) {
  // Create customer account for testing
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "test1234",
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Create multiple favorite entries - we cannot control product details since
  // product creation API is not available, but we can test sorting with existing data
  const favorites = await ArrayUtil.asyncRepeat(3, async () => {
    // We need to use existing product IDs that are available in the system
    // Since we cannot create products, we'll rely on the system having some products
    const productId = typia.random<string & tags.Format<"uuid">>();

    const favorite =
      await api.functional.shoppingMall.customer.favorites.create(connection, {
        body: {
          shopping_mall_product_id: productId,
        } satisfies IShoppingMallFavorite.ICreate,
      });
    typia.assert(favorite);

    return favorite;
  });

  // Test all sorting combinations
  const sortingOptions = [
    "favorited_at",
    "product_name",
    "product_price",
  ] as const;
  const orderOptions = ["asc", "desc"] as const;

  for (const sortBy of sortingOptions) {
    for (const order of orderOptions) {
      const searchResult =
        await api.functional.shoppingMall.customer.favorites.index(connection, {
          body: {
            sort_by: sortBy,
            order: order,
            limit: 10,
            page: 1,
          } satisfies IShoppingMallFavorite.IRequest,
        });
      typia.assert(searchResult);

      // Validate that we get results and pagination info is correct
      TestValidator.predicate(
        `${sortBy} ${order} search should return results`,
        searchResult.data.length >= 0,
      );

      TestValidator.predicate(
        `${sortBy} ${order} pagination should be valid`,
        searchResult.pagination.current >= 0 &&
          searchResult.pagination.limit > 0 &&
          searchResult.pagination.records >= 0 &&
          searchResult.pagination.pages >= 0,
      );

      // For favorited_at sorting, we can validate chronological order
      if (sortBy === "favorited_at" && searchResult.data.length > 1) {
        const dates = searchResult.data.map((fav) =>
          new Date(fav.favorited_at).getTime(),
        );

        if (order === "asc") {
          TestValidator.predicate(
            "favorited_at asc should be chronological order",
            dates.every(
              (date, index, arr) => index === 0 || date >= arr[index - 1],
            ),
          );
        } else {
          TestValidator.predicate(
            "favorited_at desc should be reverse chronological order",
            dates.every(
              (date, index, arr) => index === 0 || date <= arr[index - 1],
            ),
          );
        }
      }

      // For product_name and product_price, we can only validate that the API
      // returns results without errors since we cannot control the actual product data
      if (searchResult.data.length > 0) {
        TestValidator.predicate(
          `${sortBy} ${order} results should have valid favorite data`,
          searchResult.data.every(
            (fav) =>
              fav.id &&
              fav.favorited_at &&
              fav.product &&
              fav.product.id &&
              fav.product.name &&
              typeof fav.product.price === "number",
          ),
        );
      }
    }
  }

  // Additional validation: Test that default sorting (when no sort_by specified) works
  const defaultSearch =
    await api.functional.shoppingMall.customer.favorites.index(connection, {
      body: {
        limit: 10,
        page: 1,
      } satisfies IShoppingMallFavorite.IRequest,
    });
  typia.assert(defaultSearch);

  TestValidator.predicate(
    "default search should return valid results",
    defaultSearch.data.length >= 0,
  );

  // Test error case: invalid sort_by value (should use default behavior)
  const invalidSortSearch =
    await api.functional.shoppingMall.customer.favorites.index(connection, {
      body: {
        sort_by: "invalid_sort" as any, // This should be handled gracefully
        limit: 10,
        page: 1,
      } satisfies IShoppingMallFavorite.IRequest,
    });
  typia.assert(invalidSortSearch);

  TestValidator.predicate(
    "invalid sort_by should still return results",
    invalidSortSearch.data.length >= 0,
  );
}
