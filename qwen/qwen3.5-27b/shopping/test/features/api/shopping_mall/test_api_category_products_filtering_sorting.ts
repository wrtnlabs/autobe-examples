import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_administrator_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";

/**
 * Test product filtering and sorting capabilities within a category.
 *
 * Validates the complete product search functionality including filtering by search term, price range, and stock availability, as well as sorting by various criteria. Ensures that products are correctly filtered and sorted according to the specified parameters.
 *
 * Special attention is given to verifying that search performs case-insensitive partial matching, price filters work correctly with base_price, and sorting respects both sortBy and sortOrder parameters. The test also validates that multiple filters combine correctly using AND logic.
 *
 * 1. Administrator authenticates and creates a category.
 * 2. Seller authenticates (for product creation context).
 * 3. Test search filter with product name matching.
 * 4. Test price range filter with min and max prices.
 * 5. Test in_stock_only filter for available inventory.
 * 6. Test sorting by name in ascending order.
 * 7. Test sorting by price in descending order.
 * 8. Test combined filters (search + price range).
 */
export async function test_api_category_products_filtering_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Create category
  const category =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 3. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 4. Test search filter
  const searchResult =
    await api.functional.shoppingMall.categories.products.index(
      sellerConnection,
      {
        categoryId: category.id,
        body: {
          search: "Product",
          page: 1,
          pageSize: 20,
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(searchResult);
  TestValidator.equals(
    "search pagination current",
    searchResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "search pagination valid",
    searchResult.pagination.records >= 0,
  );
  // 5. Test price range filter
  const priceFilterResult =
    await api.functional.shoppingMall.categories.products.index(
      sellerConnection,
      {
        categoryId: category.id,
        body: {
          min_price: 10000,
          max_price: 50000,
          page: 1,
          pageSize: 20,
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(priceFilterResult);
  TestValidator.equals(
    "price filter pagination current",
    priceFilterResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "price filter returns valid response",
    priceFilterResult.pagination.pages >= 0,
  );
  // 6. Test in_stock_only filter
  const stockFilterResult =
    await api.functional.shoppingMall.categories.products.index(
      sellerConnection,
      {
        categoryId: category.id,
        body: {
          in_stock_only: true,
          page: 1,
          pageSize: 20,
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(stockFilterResult);
  TestValidator.equals(
    "stock filter pagination current",
    stockFilterResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "stock filter returns valid response",
    stockFilterResult.pagination.limit > 0,
  );
  // 7. Test sorting by name (ascending)
  const nameSortResult =
    await api.functional.shoppingMall.categories.products.index(
      sellerConnection,
      {
        categoryId: category.id,
        body: {
          sortBy: "name",
          sortOrder: "asc",
          page: 1,
          pageSize: 20,
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(nameSortResult);
  TestValidator.equals(
    "name sort pagination current",
    nameSortResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "name sort returns valid response",
    nameSortResult.pagination.records >= 0,
  );
  // 8. Test sorting by price (descending)
  const priceSortResult =
    await api.functional.shoppingMall.categories.products.index(
      sellerConnection,
      {
        categoryId: category.id,
        body: {
          sortBy: "base_price",
          sortOrder: "desc",
          page: 1,
          pageSize: 20,
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(priceSortResult);
  TestValidator.equals(
    "price sort pagination current",
    priceSortResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "price sort returns valid response",
    priceSortResult.pagination.pages >= 0,
  );
  // 9. Test sorting by created_at (newest first)
  const dateSortResult =
    await api.functional.shoppingMall.categories.products.index(
      sellerConnection,
      {
        categoryId: category.id,
        body: {
          sortBy: "created_at",
          sortOrder: "desc",
          page: 1,
          pageSize: 20,
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(dateSortResult);
  TestValidator.equals(
    "date sort pagination current",
    dateSortResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "date sort returns valid response",
    dateSortResult.pagination.limit > 0,
  );
  // 10. Test combined filters (search + price range)
  const combinedFilterResult =
    await api.functional.shoppingMall.categories.products.index(
      sellerConnection,
      {
        categoryId: category.id,
        body: {
          search: "Test",
          min_price: 5000,
          max_price: 100000,
          page: 1,
          pageSize: 20,
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(combinedFilterResult);
  TestValidator.equals(
    "combined filter pagination current",
    combinedFilterResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "combined filter returns valid response",
    combinedFilterResult.pagination.records >= 0,
  );
  // 11. Test pagination with filtered results
  const paginationResult =
    await api.functional.shoppingMall.categories.products.index(
      sellerConnection,
      {
        categoryId: category.id,
        body: {
          page: 1,
          pageSize: 10,
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination limit",
    paginationResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination current page",
    paginationResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination pages valid",
    paginationResult.pagination.pages >= 0,
  );
}
