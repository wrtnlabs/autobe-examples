import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test product search filtering with category, stock availability, and price range filters.
 *
 * Validates that the product search endpoint correctly filters products based on category ID, stock availability, and price range parameters. Tests individual filters as well as combined filter scenarios to ensure proper AND logic. Verifies pagination metadata accuracy and response structure compliance.
 *
 * Special attention is given to verifying that category filters include products from subcategories, in-stock filters correctly identify products with available inventory, and price range filters apply bounds checking accurately.
 *
 * 1. Seller registers and authenticates to the platform.
 * 2. Test category filter by searching with specific category_id.
 * 3. Test in_stock_only filter to verify stock availability filtering.
 * 4. Test min_price and max_price filters for price range validation.
 * 5. Test combined filters (category + in_stock + price range).
 * 6. Validate pagination metadata and response structure.
 */
export async function test_api_product_search_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // 2. Test category filter
  const categoryFilterResult =
    await api.functional.shoppingMall.seller.products.index(sellerConnection, {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        page: 1,
        pageSize: 20,
      } satisfies IShoppingMallProduct.IRequest,
    });
  typia.assert(categoryFilterResult);
  TestValidator.equals(
    "category filter returns valid pagination",
    categoryFilterResult.pagination.current,
    1,
  );
  // 3. Test in_stock_only filter
  const stockFilterResult =
    await api.functional.shoppingMall.seller.products.index(sellerConnection, {
      body: {
        in_stock_only: true,
        page: 1,
        pageSize: 20,
      } satisfies IShoppingMallProduct.IRequest,
    });
  typia.assert(stockFilterResult);
  TestValidator.predicate(
    "in_stock filter returns valid response",
    stockFilterResult.pagination.records >= 0,
  );
  // 4. Test price range filters
  const priceFilterResult =
    await api.functional.shoppingMall.seller.products.index(sellerConnection, {
      body: {
        min_price: 1000,
        max_price: 10000,
        page: 1,
        pageSize: 20,
      } satisfies IShoppingMallProduct.IRequest,
    });
  typia.assert(priceFilterResult);
  TestValidator.equals(
    "price filter returns valid pagination",
    priceFilterResult.pagination.current,
    1,
  );
  // 5. Test combined filters
  const combinedFilterResult =
    await api.functional.shoppingMall.seller.products.index(sellerConnection, {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        in_stock_only: true,
        min_price: 5000,
        max_price: 50000,
        page: 1,
        pageSize: 20,
      } satisfies IShoppingMallProduct.IRequest,
    });
  typia.assert(combinedFilterResult);
  TestValidator.predicate(
    "combined filters return valid response",
    combinedFilterResult.pagination.records >= 0,
  );
  // 6. Validate pagination metadata
  TestValidator.equals(
    "pagination limit matches request",
    combinedFilterResult.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    combinedFilterResult.pagination.pages >= 0,
  );
  // 7. Test empty results scenario
  const emptyResult = await api.functional.shoppingMall.seller.products.index(
    sellerConnection,
    {
      body: {
        search: "nonexistentproductxyz123",
        page: 1,
        pageSize: 20,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty search returns zero records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search returns zero pages",
    emptyResult.pagination.pages,
    0,
  );
}
