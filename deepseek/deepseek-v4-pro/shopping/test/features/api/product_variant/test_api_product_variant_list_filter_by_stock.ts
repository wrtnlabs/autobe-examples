import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

/**
 * Test product variant listing with stock_status filter.
 *
 * Validates that the stock_status filter correctly partitions variants by their derived stock quantity. Two variants are created under a single product: one with positive initial stock (in-stock) and one with zero initial stock (out-of-stock). The customer then lists variants with stock_status='in_stock' and verifies that only the in-stock variant appears in the results, that all returned variants have positive stock_quantity, and that the pagination record count reflects only the filtered subset. A second unfiltered request confirms that both variants are returned when no stock_status filter is applied, validating that the filter does not permanently hide variants.
 *
 * The filter is validated to apply before pagination — the total record count in the pagination metadata must match the count of filtered results, not the total variant count.
 *
 * 1. Administrator registers and creates a product category.
 * 2. Seller registers and is approved by the administrator.
 * 3. Seller creates a product under the category.
 * 4. Seller creates variant A with positive initial stock (100 units).
 * 5. Seller creates variant B with zero initial stock (0 units).
 * 6. Customer registers and authenticates.
 * 7. Customer lists variants with stock_status='in_stock' — validates only variant A is returned with positive stock, and pagination count matches.
 * 8. Customer lists variants without filter — validates both variants are returned.
 */
export async function test_api_product_variant_list_filter_by_stock(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 3. Admin approves seller
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: seller.id,
  });
  // 4. Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: category.id,
      },
    },
  );
  typia.assert(product);
  // 5. Seller creates variant A with positive initial stock (in-stock)
  const variantInStock =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          initialStockQuantity: 100,
        },
      },
    );
  typia.assert(variantInStock);
  // 6. Seller creates variant B with zero initial stock (out-of-stock)
  const variantOutOfStock =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          initialStockQuantity: 0,
        },
      },
    );
  typia.assert(variantOutOfStock);
  // 7. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 8. List variants with stock_status='in_stock'
  const inStockResult =
    await api.functional.shoppingMall.customer.products.variants.index(
      customerConnection,
      {
        productId: product.id,
        body: {
          stock_status: "in_stock",
        },
      },
    );
  typia.assert(inStockResult);
  // Validate in-stock filter: all returned variants have positive stock
  TestValidator.predicate(
    "all in-stock variants have positive stock_quantity",
    () => inStockResult.data.every((v) => v.stock_quantity > 0),
  );
  // Validate filter applied before pagination: record count matches data length
  TestValidator.equals(
    "in-stock pagination records match filtered count",
    inStockResult.pagination.records,
    inStockResult.data.length,
  );
  // Validate in-stock variant is present
  TestValidator.predicate("in-stock variant included in filtered results", () =>
    inStockResult.data.some((v) => v.id === variantInStock.id),
  );
  // Validate out-of-stock variant is excluded
  TestValidator.predicate(
    "out-of-stock variant excluded from filtered results",
    () => !inStockResult.data.some((v) => v.id === variantOutOfStock.id),
  );
  // 9. List variants without stock_status filter
  const allResult =
    await api.functional.shoppingMall.customer.products.variants.index(
      customerConnection,
      {
        productId: product.id,
        body: {},
      },
    );
  typia.assert(allResult);
  // Validate unfiltered request: pagination records match data length
  TestValidator.equals(
    "unfiltered pagination records match total count",
    allResult.pagination.records,
    allResult.data.length,
  );
  // Validate both variants are present in unfiltered results
  TestValidator.predicate(
    "at least two variants in unfiltered results",
    () => allResult.data.length >= 2,
  );
  TestValidator.predicate(
    "in-stock variant present in unfiltered results",
    () => allResult.data.some((v) => v.id === variantInStock.id),
  );
  TestValidator.predicate(
    "out-of-stock variant present in unfiltered results",
    () => allResult.data.some((v) => v.id === variantOutOfStock.id),
  );
}
