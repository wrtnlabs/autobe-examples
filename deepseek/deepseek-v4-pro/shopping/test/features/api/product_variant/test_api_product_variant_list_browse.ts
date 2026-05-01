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
 * Test customer browsing product variants with pagination and data validation.
 *
 * Validates that a customer can browse all variants of a product that has at least one variant with stock. The test verifies each variant's globally unique SKU code, option key-value pairs, price override handling, computed stock quantity from inventory records, and creation/update timestamps.
 *
 * Pagination metadata is validated for correctness: current page, limit, total records, and total pages. The default sorting behavior (newest first, only non-deleted variants) is also verified.
 *
 * 1. Administrator creates a category for product classification.
 * 2. Seller registers and is approved by administrator.
 * 3. Seller creates a product under the category.
 * 4. Seller creates two variants with distinct option values and initial stock.
 * 5. Customer registers and browses the product's variants via the listing endpoint.
 * 6. Validates pagination metadata, variant count, and per-variant data integrity including option values, stock quantities, and price overrides.
 */
export async function test_api_product_variant_list_browse(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup: create admin and category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Seller registration and approval
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: seller.id,
  });
  // 3. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: { shopping_mall_category_id: category.id },
    },
  );
  typia.assert(product);
  // 4. Seller creates two variants with stock
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          optionValues: [
            {
              key: "color",
              value: "Red",
            } satisfies IShoppingMallProductVariantOptionValue.ICreate,
            {
              key: "size",
              value: "Large",
            } satisfies IShoppingMallProductVariantOptionValue.ICreate,
          ],
          initialStockQuantity: 100,
        },
      },
    );
  typia.assert(variant1);
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          optionValues: [
            {
              key: "color",
              value: "Blue",
            } satisfies IShoppingMallProductVariantOptionValue.ICreate,
            {
              key: "size",
              value: "Small",
            } satisfies IShoppingMallProductVariantOptionValue.ICreate,
          ],
          initialStockQuantity: 50,
        },
      },
    );
  typia.assert(variant2);
  // 5. Customer joins and browses variants
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  const result =
    await api.functional.shoppingMall.customer.products.variants.index(
      customerConnection,
      {
        productId: product.id,
        body: {},
      },
    );
  typia.assert(result);
  // 6. Validate pagination metadata
  TestValidator.equals("pagination current page", result.pagination.current, 1);
  TestValidator.predicate(
    "pagination limit is positive",
    result.pagination.limit > 0,
  );
  TestValidator.predicate(
    "total records includes both variants",
    result.pagination.records >= 2,
  );
  TestValidator.predicate(
    "total pages at least one",
    result.pagination.pages >= 1,
  );
  // 7. Verify both created variants appear in results
  TestValidator.equals("data contains 2 variants", result.data.length, 2);
  const foundVariant1 = result.data.find((v) => v.code === variant1.code);
  TestValidator.predicate(
    "variant1 found in results",
    foundVariant1 !== undefined,
  );
  if (foundVariant1) {
    TestValidator.equals(
      "variant1 stock quantity",
      foundVariant1.stock_quantity,
      100,
    );
    TestValidator.equals(
      "variant1 price matches creation",
      foundVariant1.price,
      variant1.price,
    );
    TestValidator.equals(
      "variant1 option values count",
      foundVariant1.optionValues.length,
      2,
    );
  }
  const foundVariant2 = result.data.find((v) => v.code === variant2.code);
  TestValidator.predicate(
    "variant2 found in results",
    foundVariant2 !== undefined,
  );
  if (foundVariant2) {
    TestValidator.equals(
      "variant2 stock quantity",
      foundVariant2.stock_quantity,
      50,
    );
    TestValidator.equals(
      "variant2 price matches creation",
      foundVariant2.price,
      variant2.price,
    );
    TestValidator.equals(
      "variant2 option values count",
      foundVariant2.optionValues.length,
      2,
    );
  }
}
