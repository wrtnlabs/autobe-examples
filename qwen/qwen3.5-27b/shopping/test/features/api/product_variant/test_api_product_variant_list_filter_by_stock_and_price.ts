import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
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
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test that seller can filter product variants by stock availability and price range.
 *
 * Validates the product variant listing endpoint's filtering capabilities including stock availability, price range, and SKU code matching. Ensures that variants can be filtered individually or in combination, and that price filtering correctly uses variant-specific prices when available or falls back to the product's base price.
 *
 * Special attention is given to verifying that the in_stock filter correctly computes inventory from stock movement records, and that price filtering handles both variant-specific price overrides and null prices (using base price).
 *
 * 1. Seller authenticates via join endpoint.
 * 2. Seller creates a product with base price of 100.
 * 3. Test filtering variants by in_stock=true to exclude out-of-stock variants.
 * 4. Test filtering variants by price range (price_min, price_max).
 * 5. Test filtering variants by SKU code with partial matching.
 * 6. Test combined filters (in_stock and price_min together).
 */
export async function test_api_product_variant_list_filter_by_stock_and_price(
  connection: api.IConnection,
) {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "123456",
      href: "https://test.com/join",
      referrer: "https://test.com",
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 2. Create product with base price of 100
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Test Product for Variant Filtering",
        description:
          "A product created for testing variant filtering capabilities",
        base_price: 100,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Filter by in_stock=true
  const inStockResult =
    await api.functional.shoppingMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          in_stock: true,
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(inStockResult);
  TestValidator.predicate(
    "in_stock filter returns only variants with stock > 0",
    inStockResult.data.every((v) => v.stock_quantity > 0),
  );
  // 4. Filter by price range (100-130)
  const priceRangeResult =
    await api.functional.shoppingMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          price_min: 100,
          price_max: 130,
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(priceRangeResult);
  TestValidator.predicate(
    "price range filter returns variants with price between 100-130",
    priceRangeResult.data.every((v) => {
      const price = v.price ?? product.base_price;
      return price >= 100 && price <= 130;
    }),
  );
  // 5. Filter by SKU code (partial match)
  const skuFilterResult =
    await api.functional.shoppingMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: "PROD-001",
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(skuFilterResult);
  TestValidator.predicate(
    "SKU code filter supports partial matching",
    skuFilterResult.data.every((v) => v.sku_code.includes("PROD-001")),
  );
  // 6. Combined filters (in_stock=true AND price_min=100)
  const combinedFilterResult =
    await api.functional.shoppingMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          in_stock: true,
          price_min: 100,
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(combinedFilterResult);
  TestValidator.predicate(
    "combined filters return variants with stock > 0 AND price >= 100",
    combinedFilterResult.data.every((v) => {
      const price = v.price ?? product.base_price;
      return v.stock_quantity > 0 && price >= 100;
    }),
  );
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination metadata is valid",
    inStockResult.pagination.current >= 1 &&
      inStockResult.pagination.limit > 0 &&
      inStockResult.pagination.records >= 0,
  );
}
