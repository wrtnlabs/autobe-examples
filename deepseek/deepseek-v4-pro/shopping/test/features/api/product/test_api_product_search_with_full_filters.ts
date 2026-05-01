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
 * Test product search with the complete set of available filters including text search, category, price range, in-stock-only, price-ascending sort, and custom pagination.
 *
 * Authenticates a customer and performs a product search using every filter parameter simultaneously. The search term enables trigram-based fuzzy name matching, the category filter restricts results to a specific category subtree, the price range bounds the effective variant prices, and the in-stock-only flag excludes unavailable products.
 *
 * Validates that the response structure conforms to the expected paginated summary type, pagination metadata accurately reflects the result set, all returned products are purchasable, prices are sorted in ascending order, and each product's effective minimum price falls within the specified range.
 *
 * 1. Customer authenticates via join to obtain actor-specific connection.
 * 2. Issues a product search request with text search, category, price bounds, in-stock flag, price_asc sort, and pagination (page=1, limit=10).
 * 3. Asserts response type, validates pagination metadata, and verifies product-level constraints on purchasability, price ordering, and range compliance.
 */
export async function test_api_product_search_with_full_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Build search request with all filters
  const minPrice = 0;
  const maxPrice = 999999;
  const searchBody = {
    search: RandomGenerator.alphabets(3),
    category_id: typia.random<string & tags.Format<"uuid">>(),
    min_price: minPrice satisfies number as number,
    max_price: maxPrice satisfies number as number,
    in_stock_only: true,
    sort: "price_asc" as const,
    page: 1 satisfies number as number,
    limit: 10 satisfies number as number,
  } satisfies IShoppingMallProduct.IRequest;
  // 3. Call product search endpoint
  const result: IPageIShoppingMallProduct.ISummary =
    await api.functional.shoppingMall.customer.products.index(
      customerConnection,
      { body: searchBody },
    );
  typia.assert(result);
  // 4. Validate pagination metadata
  const { pagination, data } = result;
  TestValidator.equals("pagination current page", pagination.current, 1);
  TestValidator.equals("pagination limit", pagination.limit, 10);
  TestValidator.predicate(
    "pagination records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages equals ceil(records / limit)",
    pagination.pages === Math.ceil(pagination.records / pagination.limit),
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    data.length <= pagination.limit,
  );
  // 5. Validate product-level constraints when results exist
  if (data.length > 0) {
    // 5.1. All products must be purchasable (in_stock_only filter)
    for (const product of data) {
      TestValidator.predicate(
        `product ${product.id} is purchasable`,
        product.is_purchasable,
      );
    }
    // 5.2. Verify price ascending sort order
    for (let i = 1; i < data.length; i++) {
      const prevPrice = data[i - 1].min_variant_price ?? data[i - 1].base_price;
      const currPrice = data[i].min_variant_price ?? data[i].base_price;
      TestValidator.predicate(
        `products sorted by effective price ascending at index ${i}`,
        prevPrice <= currPrice,
      );
    }
    // 5.3. Verify each product's effective price falls within the price range
    for (const product of data) {
      const effectiveMinPrice = product.min_variant_price ?? product.base_price;
      TestValidator.predicate(
        `product ${product.id} effective price >= min_price`,
        effectiveMinPrice >= minPrice,
      );
      TestValidator.predicate(
        `product ${product.id} effective price <= max_price`,
        effectiveMinPrice <= maxPrice,
      );
    }
  }
}
