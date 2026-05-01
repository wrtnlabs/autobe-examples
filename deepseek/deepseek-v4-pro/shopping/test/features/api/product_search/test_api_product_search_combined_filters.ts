import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test combined product search filters including category, price range, in-stock only, and sorting.
 *
 * Validates that the product search endpoint correctly applies multiple simultaneous filters and returns only products matching all specified criteria. The test exercises category filtering, price range boundaries, stock availability toggling, ascending price sort order, and pagination configuration in a single request.
 *
 * Special attention is given to verifying that visibility filters (non-suspended, non-banned sellers) are inherently applied, that only purchasable products appear when in_stock_only is active, and that pagination metadata accurately reflects the filtered result set rather than the unfiltered total.
 *
 * 1. Customer authenticates via join to access the search endpoint.
 * 2. Searches with category_id, min_price, max_price, in_stock_only=true, sort=price_asc, page=1, limit=10.
 * 3. Validates every returned product's base_price falls within the specified range.
 * 4. Verifies all returned products have is_purchasable set to true.
 * 5. Confirms no returned product belongs to a suspended or banned seller.
 * 6. Checks that results are sorted by base_price in ascending order.
 * 7. Validates pagination metadata correctness.
 */
export async function test_api_product_search_combined_filters(
  connection: api.IConnection,
): Promise<void> {
  // Create customer connection
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // Define price range for filter validation
  const minPrice = 500;
  const maxPrice = 50000;
  // Search with combined filters
  const result =
    await api.functional.shoppingMall.customer.search.products.search(
      customerConnection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          min_price: minPrice satisfies number as number,
          max_price: maxPrice satisfies number as number,
          in_stock_only: true,
          sort: "price_asc",
          page: 1 satisfies number as number,
          limit: 10 satisfies number as number,
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(result);
  // Validate: Every product's base_price within [minPrice, maxPrice]
  // Validate: is_purchasable when in_stock_only is true
  // Validate: seller not suspended and not banned
  for (const product of result.data) {
    TestValidator.predicate(
      "base_price within price range",
      product.base_price >= minPrice && product.base_price <= maxPrice,
    );
    TestValidator.predicate(
      "product is purchasable when in_stock_only is true",
      product.is_purchasable,
    );
    TestValidator.predicate(
      "seller is not suspended",
      !product.seller.suspended,
    );
    TestValidator.predicate("seller is not banned", !product.seller.banned);
  }
  // Validate: results sorted by base_price ascending
  for (let i = 1; i < result.data.length; i++) {
    TestValidator.predicate(
      "sorted by base_price ascending",
      result.data[i - 1].base_price <= result.data[i].base_price,
    );
  }
  // Validate pagination metadata
  TestValidator.equals("current page", result.pagination.current, 1);
  TestValidator.equals("limit per page", result.pagination.limit, 10);
  TestValidator.predicate(
    "total records >= data length",
    result.pagination.records >= result.data.length,
  );
}
