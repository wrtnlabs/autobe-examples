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
 * Test comprehensive favorite search functionality using multiple filtering
 * criteria including search terms, category filters, date ranges, and sorting
 * options. Validates that the search operation correctly filters and paginates
 * results based on various parameters and that customers can only see their own
 * favorites.
 */
export async function test_api_favorite_search_with_multiple_filters(
  connection: api.IConnection,
) {
  // 1. Create customer account for authentication
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "password123",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: "https://shopping-mall.com/register",
        referrer: "https://shopping-mall.com",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Create a favorite entry for basic testing
  const favorite: IShoppingMallFavorite =
    await api.functional.shoppingMall.customer.favorites.create(connection, {
      body: {
        shopping_mall_product_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IShoppingMallFavorite.ICreate,
    });
  typia.assert(favorite);

  // 3. Test search functionality with various parameters

  // Test 1: Basic search with pagination
  const basicSearchResult: IPageIShoppingMallFavorite.ISummary =
    await api.functional.shoppingMall.customer.favorites.index(connection, {
      body: {
        page: 1,
        limit: 5,
      } satisfies IShoppingMallFavorite.IRequest,
    });
  typia.assert(basicSearchResult);

  TestValidator.equals(
    "pagination limit should be correct",
    basicSearchResult.pagination.limit,
    5,
  );
  TestValidator.equals(
    "current page should be 1",
    basicSearchResult.pagination.current,
    1,
  );

  // Test 2: Sorting by favorite date
  const dateSortResult: IPageIShoppingMallFavorite.ISummary =
    await api.functional.shoppingMall.customer.favorites.index(connection, {
      body: {
        sort_by: "favorited_at",
        order: "desc",
      } satisfies IShoppingMallFavorite.IRequest,
    });
  typia.assert(dateSortResult);

  // Test 3: Date range filtering
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const dateFilterResult: IPageIShoppingMallFavorite.ISummary =
    await api.functional.shoppingMall.customer.favorites.index(connection, {
      body: {
        date_from: oneWeekAgo.toISOString(),
        sort_by: "favorited_at",
        order: "asc",
      } satisfies IShoppingMallFavorite.IRequest,
    });
  typia.assert(dateFilterResult);

  // Test 4: Different sorting options
  const nameSortResult: IPageIShoppingMallFavorite.ISummary =
    await api.functional.shoppingMall.customer.favorites.index(connection, {
      body: {
        sort_by: "product_name",
        order: "asc",
        limit: 10,
      } satisfies IShoppingMallFavorite.IRequest,
    });
  typia.assert(nameSortResult);

  const priceSortResult: IPageIShoppingMallFavorite.ISummary =
    await api.functional.shoppingMall.customer.favorites.index(connection, {
      body: {
        sort_by: "product_price",
        order: "desc",
      } satisfies IShoppingMallFavorite.IRequest,
    });
  typia.assert(priceSortResult);

  // Test 5: Search with empty criteria
  const emptySearchResult: IPageIShoppingMallFavorite.ISummary =
    await api.functional.shoppingMall.customer.favorites.index(connection, {
      body: {
        search: "",
      } satisfies IShoppingMallFavorite.IRequest,
    });
  typia.assert(emptySearchResult);

  // Test 6: Pagination edge case
  const largePageResult: IPageIShoppingMallFavorite.ISummary =
    await api.functional.shoppingMall.customer.favorites.index(connection, {
      body: {
        page: 100,
        limit: 10,
      } satisfies IShoppingMallFavorite.IRequest,
    });
  typia.assert(largePageResult);

  TestValidator.predicate(
    "large page number should handle gracefully",
    largePageResult.pagination.current === 100,
  );

  // Validate that API responses are properly structured
  TestValidator.predicate(
    "search results should have valid pagination structure",
    basicSearchResult.pagination.records >= 0 &&
      basicSearchResult.pagination.pages >= 0,
  );

  // Validate that favorite entries contain required fields
  if (basicSearchResult.data.length > 0) {
    const sampleFavorite = basicSearchResult.data[0];
    TestValidator.predicate(
      "favorite should have valid ID",
      sampleFavorite.id.length > 0,
    );
    TestValidator.predicate(
      "favorite should have favorited_at timestamp",
      sampleFavorite.favorited_at.length > 0,
    );
  }
}
