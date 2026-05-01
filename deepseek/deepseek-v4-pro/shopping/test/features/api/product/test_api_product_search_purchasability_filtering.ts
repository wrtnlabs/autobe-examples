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
 * Test product search purchasability filtering logic for stock-based product visibility.
 *
 * Validates that the product search endpoint correctly computes and filters products based on purchasability status derived from the inventory ledger system. The purchasable flag indicates whether at least one non-deleted variant has positive stock, computed by summing all inventory record quantity changes.
 *
 * The test exercises two search modes to verify the filtering contract:
 *
 * 1. Customer registers via join to access the product search endpoint.
 * 2. First search without `in_stock_only` retrieves all visible products, both purchasable and unpurchasable.
 * 3. Purchasable products are verified to have non-null variant price ranges (`min_variant_price`, `max_variant_price`), confirming at least one non-deleted variant with positive stock exists.
 * 4. Second search with `in_stock_only = true` is performed.
 * 5. All products in the in-stock-only result must have `is_purchasable = true`.
 * 6. Any unpurchasable products from the first call are verified absent from the second call, confirming the exclusion logic works correctly.
 */
export async function test_api_product_search_purchasability_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Search all products without in_stock_only filter
  const allProducts = await api.functional.shoppingMall.customer.products.index(
    customerConnection,
    {
      body: {} satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(allProducts);
  // 3. Categorize by purchasability
  const purchasable = allProducts.data.filter((p) => p.is_purchasable);
  const unpurchasable = allProducts.data.filter((p) => !p.is_purchasable);
  // 4. Purchasable products must have variant pricing
  for (const product of purchasable) {
    TestValidator.predicate(
      `purchasable product should have variant prices`,
      product.min_variant_price !== null && product.max_variant_price !== null,
    );
  }
  // 5. Search with in_stock_only = true
  const inStockOnly = await api.functional.shoppingMall.customer.products.index(
    customerConnection,
    {
      body: {
        in_stock_only: true,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(inStockOnly);
  // 6. All in-stock-only products must be purchasable
  TestValidator.predicate(
    "all in_stock_only products should be purchasable",
    inStockOnly.data.every((p) => p.is_purchasable),
  );
  // 7. Unpurchasable products must be excluded from in_stock_only results
  if (unpurchasable.length > 0) {
    const unpurchasableIds = new Set(unpurchasable.map((p) => p.id));
    const leaked = inStockOnly.data.filter((p) => unpurchasableIds.has(p.id));
    TestValidator.equals(
      "unpurchasable products excluded from in_stock_only results",
      leaked.length,
      0,
    );
  }
}
