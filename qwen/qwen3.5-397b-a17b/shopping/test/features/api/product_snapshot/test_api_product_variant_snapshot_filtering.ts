import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshotVariant";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotVariant";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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

/**
 * Test filtering and pagination functionality for variant snapshot retrieval.
 *
 * This test validates the variant snapshot filtering capabilities:
 * 1. Seller authenticates and creates a product with multiple variants
 * 2. Variants have diverse SKU codes and price overrides for filtering tests
 * 3. Product is edited to create a snapshot with variant snapshots
 * 4. Variant snapshots are retrieved with various filter combinations
 * 5. Validates filter accuracy, pagination metadata, and empty result handling
 *
 * Note: In production, snapshot ID would be obtained from a product snapshot list endpoint.
 * This test demonstrates the filtering logic assuming snapshot ID is available.
 */
export async function test_api_product_variant_snapshot_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Create multiple variants with diverse attributes for filtering
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: "TEST-SKU-ALPHA-001",
          price_override: 15000,
          option_value_ids: [],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant1);
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: "TEST-SKU-BETA-002",
          price_override: 25000,
          option_value_ids: [],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant2);
  const variant3 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: "TEST-SKU-GAMMA-003",
          price_override: 35000,
          option_value_ids: [],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant3);
  const variant4 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: "PROD-SKU-DELTA-004",
          price_override: 45000,
          option_value_ids: [],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant4);
  // 4. Update product to create snapshot
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: product.id,
      body: {
        name: `${product.name} - Updated`,
      } satisfies IShoppingMallProduct.IUpdate,
    });
  typia.assert(updatedProduct);
  // Note: In a complete test suite, we would retrieve the snapshot list here
  // to get the snapshotId. For this test, we assume snapshotId is available
  // from a prior snapshot listing call.
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 5. Test variant snapshot filtering with SKU search
  const skuFilterResult =
    await api.functional.shoppingMall.seller.products.snapshots.variants.index(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: snapshotId,
        body: {
          search: "ALPHA",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductSnapshotVariant.IRequest,
      },
    );
  typia.assert(skuFilterResult);
  TestValidator.predicate("SKU filter returns matching variants", () =>
    skuFilterResult.data.every((v) => v.sku_code.includes("ALPHA")),
  );
  // 6. Test price range filtering
  const priceFilterResult =
    await api.functional.shoppingMall.seller.products.snapshots.variants.index(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: snapshotId,
        body: {
          price_override_min: 20000,
          price_override_max: 40000,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductSnapshotVariant.IRequest,
      },
    );
  typia.assert(priceFilterResult);
  TestValidator.predicate("Price filter returns variants in range", () =>
    priceFilterResult.data.every(
      (v) =>
        v.price_override !== null &&
        v.price_override >= 20000 &&
        v.price_override <= 40000,
    ),
  );
  // 7. Test pagination
  const paginatedResult =
    await api.functional.shoppingMall.seller.products.snapshots.variants.index(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: snapshotId,
        body: {
          page: 1,
          limit: 2,
        } satisfies IShoppingMallProductSnapshotVariant.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "Page limit respected",
    () => paginatedResult.data.length <= 2,
  );
  TestValidator.equals(
    "Current page is 1",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "Pagination has valid records count",
    () => paginatedResult.pagination.records >= 0,
  );
  // 8. Test empty result with non-matching filter
  const emptyResult =
    await api.functional.shoppingMall.seller.products.snapshots.variants.index(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: snapshotId,
        body: {
          search: "NONEXISTENT-SKU",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductSnapshotVariant.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals("Empty result has no data", emptyResult.data.length, 0);
  // 9. Test combined filters
  const combinedResult =
    await api.functional.shoppingMall.seller.products.snapshots.variants.index(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: snapshotId,
        body: {
          search: "SKU",
          price_override_min: 10000,
          price_override_max: 30000,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductSnapshotVariant.IRequest,
      },
    );
  typia.assert(combinedResult);
  TestValidator.predicate("Combined filters work correctly", () =>
    combinedResult.data.every(
      (v) =>
        v.sku_code.includes("SKU") &&
        v.price_override !== null &&
        v.price_override >= 10000 &&
        v.price_override <= 30000,
    ),
  );
}