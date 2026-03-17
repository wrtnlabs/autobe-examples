import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryRecord";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
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
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

export async function test_api_inventory_record_date_range_query(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - join and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_category_id: typia.random<string & tags.Format<"uuid">>(),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Create variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(10)}`,
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100>
          >(),
          options: [
            {
              key: "color",
              value: "Red",
            },
          ] satisfies IShoppingMallProductVariantOption.ICreate[],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 4. Test inventory record query with various date range filters
  const now = new Date();
  const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const to = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  // Test 1: Query with from date parameter
  const fromResult =
    await api.functional.shoppingMall.seller.products.variants.inventory.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          from: from.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(fromResult);
  // Test 2: Query with to date parameter
  const toResult =
    await api.functional.shoppingMall.seller.products.variants.inventory.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          to: to.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(toResult);
  // Test 3: Query with both from and to date parameters (date range filtering)
  const rangeResult =
    await api.functional.shoppingMall.seller.products.variants.inventory.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          from: from.toISOString(),
          to: to.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(rangeResult);
  // Test 4: Query with sort=created_at,asc (oldest records first)
  const ascResult =
    await api.functional.shoppingMall.seller.products.variants.inventory.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          sort: "created_at,asc",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(ascResult);
  // Test 5: Query with sort=created_at,desc (newest records first)
  const descResult =
    await api.functional.shoppingMall.seller.products.variants.inventory.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          sort: "created_at,desc",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(descResult);
  // Test 6: Verify pagination with different page and limit values
  const page1Result =
    await api.functional.shoppingMall.seller.products.variants.inventory.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(page1Result);
  TestValidator.equals("page1 current", page1Result.pagination.current, 1);
  TestValidator.equals("page1 limit", page1Result.pagination.limit, 5);
  const page2Result =
    await api.functional.shoppingMall.seller.products.variants.inventory.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          page: 2,
          limit: 5,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(page2Result);
  TestValidator.equals("page2 current", page2Result.pagination.current, 2);
  TestValidator.equals("page2 limit", page2Result.pagination.limit, 5);
  // Test 7: Edge case - date range with no matching records returns empty data
  const pastFrom = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  const pastTo = new Date(now.getTime() - 360 * 24 * 60 * 60 * 1000);
  const emptyResult =
    await api.functional.shoppingMall.seller.products.variants.inventory.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          from: pastFrom.toISOString(),
          to: pastTo.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals("empty result pages", emptyResult.pagination.pages, 0);
  TestValidator.equals("empty result data length", emptyResult.data.length, 0);
  // Test 8: Validate response structure includes required pagination fields
  TestValidator.predicate(
    "pagination has current",
    rangeResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    rangeResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records",
    rangeResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    rangeResult.pagination.pages >= 0,
  );
}