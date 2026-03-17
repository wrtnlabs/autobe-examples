import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IPageIShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistic";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
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

export async function test_api_product_variant_snapshot_filter_by_sku_and_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      shop_name: RandomGenerator.name(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Create a product (utility handles category internally)
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 3. Create first variant with specific SKU code
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-TEST-001-RED`,
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
          options: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ],
        },
      },
    );
  typia.assert(variant1);
  // 4. Create second variant with different SKU code
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-TEST-002-BLUE`,
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
          options: [
            { key: "color", value: "Blue" },
            { key: "size", value: "Medium" },
          ],
        },
      },
    );
  typia.assert(variant2);
  // 5. Create third variant with different SKU code
  const variant3 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-TEST-003-GREEN`,
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
          options: [
            { key: "color", value: "Green" },
            { key: "size", value: "Small" },
          ],
        },
      },
    );
  typia.assert(variant3);
  // 6. Edit variant1 to create first snapshot
  const updatedVariant1 =
    await api.functional.shoppingMall.seller.sellers.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant1.id,
        body: {
          skuCode: `SKU-TEST-001-RED-V2`,
          stockQuantity: variant1.stockQuantity + 5,
        },
      },
    );
  typia.assert(updatedVariant1);
  // 7. Edit variant2 to create second snapshot
  const updatedVariant2 =
    await api.functional.shoppingMall.seller.sellers.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant2.id,
        body: {
          price: product.base_price + 100,
          optionValues: { color: "Navy", size: "Medium" },
        },
      },
    );
  typia.assert(updatedVariant2);
  // 8. Edit variant3 to create third snapshot
  const updatedVariant3 =
    await api.functional.shoppingMall.seller.sellers.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant3.id,
        body: {
          stockQuantity: variant3.stockQuantity + 10,
          optionValues: { color: "Dark Green", size: "Small" },
        },
      },
    );
  typia.assert(updatedVariant3);
  // 9. Get product snapshots to obtain snapshotId
  const productSnapshots =
    await api.functional.shoppingMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 10,
          sort: "snapshot_at,desc",
        },
      },
    );
  typia.assert(productSnapshots);
  TestValidator.predicate(
    "has product snapshots",
    productSnapshots.data.length > 0,
  );
  // Use the most recent snapshot for variant snapshot testing
  const latestSnapshot = productSnapshots.data[0];
  // 10. Test filtering by sku_code partial match
  const skuFilterResult =
    await api.functional.shoppingMall.seller.products.snapshots.variantSnapshots.index(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: latestSnapshot.id,
        body: {
          sku_code: "001",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(skuFilterResult);
  TestValidator.predicate(
    "sku_code filter returns matching variants",
    skuFilterResult.data.every((v) => v.sku_code.includes("001")),
  );
  // 11. Test filtering by date range (use broad range to ensure snapshots are captured)
  const snapshotDate = new Date(latestSnapshot.snapshot_at);
  const dayBefore = new Date(snapshotDate.getTime() - 24 * 60 * 60 * 1000);
  const dayAfter = new Date(snapshotDate.getTime() + 24 * 60 * 60 * 1000);
  const dateFilterResult =
    await api.functional.shoppingMall.seller.products.snapshots.variantSnapshots.index(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: latestSnapshot.id,
        body: {
          snapshot_at_from: dayBefore.toISOString(),
          snapshot_at_to: dayAfter.toISOString(),
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(dateFilterResult);
  TestValidator.predicate(
    "date range filter returns snapshots within timeframe",
    dateFilterResult.data.every(
      (v) =>
        new Date(v.snapshot_at) >= dayBefore &&
        new Date(v.snapshot_at) <= dayAfter,
    ),
  );
  // 12. Test filtering by option_values text search
  const optionFilterResult =
    await api.functional.shoppingMall.seller.products.snapshots.variantSnapshots.index(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: latestSnapshot.id,
        body: {
          option_values: "Green",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(optionFilterResult);
  TestValidator.predicate(
    "option_values filter returns matching variants",
    optionFilterResult.data.every((v) =>
      JSON.stringify(v.option_values).includes("Green"),
    ),
  );
  // 13. Test combining multiple filters
  const combinedFilterResult =
    await api.functional.shoppingMall.seller.products.snapshots.variantSnapshots.index(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: latestSnapshot.id,
        body: {
          sku_code: "TEST",
          option_values: "Red",
          snapshot_at_from: dayBefore.toISOString(),
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(combinedFilterResult);
  TestValidator.predicate(
    "combined filters work correctly",
    combinedFilterResult.data.every(
      (v) =>
        v.sku_code.includes("TEST") &&
        JSON.stringify(v.option_values).includes("Red"),
    ),
  );
  // 14. Test empty results with proper pagination metadata
  const emptyFilterResult =
    await api.functional.shoppingMall.seller.products.snapshots.variantSnapshots.index(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: latestSnapshot.id,
        body: {
          sku_code: "NONEXISTENT-SKU-CODE",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(emptyFilterResult);
  TestValidator.equals(
    "empty results have zero records",
    emptyFilterResult.data.length,
    0,
  );
  TestValidator.equals(
    "pagination current page",
    emptyFilterResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination records count",
    emptyFilterResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages count",
    emptyFilterResult.pagination.pages,
    0,
  );
}
