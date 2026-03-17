import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistic";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test in-stock variant filtering functionality.
 * 1. Seller registers and authenticates
 * 2. Seller creates a product
 * 3. Query variants with inStock=true filter - should return only variants with stock_quantity > 0
 * 4. Query variants without filter - should return all variants
 * 5. Verify filtering logic correctly separates in-stock from out-of-stock variants
 */
export async function test_api_product_variant_filter_in_stock(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
    },
  });
  typia.assert(seller);
  // 2. Create a product
  const product =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      { body: {} },
    );
  typia.assert(product);
  // 3. Query variants with inStock=true filter
  const inStockVariants =
    await api.functional.shoppingMall.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          inStock: true,
          page: 1,
          limit: 100,
        },
      },
    );
  typia.assert(inStockVariants);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page",
    () => inStockVariants.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit",
    () => inStockVariants.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count",
    () => inStockVariants.pagination.records >= 0,
  );
  // Verify all returned variants have stock_quantity > 0
  for (const variant of inStockVariants.data) {
    TestValidator.predicate(
      `variant ${variant.skuCode} stock quantity must be positive`,
      () => variant.stockQuantity > 0,
    );
  }
  // 4. Query all variants without inStock filter
  const allVariants = await api.functional.shoppingMall.products.variants.index(
    sellerConnection,
    {
      productId: product.id,
      body: {
        page: 1,
        limit: 100,
      },
    },
  );
  typia.assert(allVariants);
  // 5. Verify the unfiltered query returns all variants (in-stock count <= total count)
  TestValidator.predicate(
    "all variants count should be >= in-stock variants count",
    () => allVariants.data.length >= inStockVariants.data.length,
  );
  // Verify pagination records match data length for unfiltered query
  TestValidator.equals(
    "unfiltered pagination records match data length",
    allVariants.pagination.records,
    allVariants.data.length,
  );
  // Verify all in-stock variants are included in the full list
  const inStockIds = new Set(inStockVariants.data.map((v) => v.id));
  for (const variant of allVariants.data) {
    if (variant.stockQuantity > 0) {
      TestValidator.predicate(
        `in-stock variant ${variant.skuCode} should be in full list`,
        () => inStockIds.has(variant.id),
      );
    }
  }
}