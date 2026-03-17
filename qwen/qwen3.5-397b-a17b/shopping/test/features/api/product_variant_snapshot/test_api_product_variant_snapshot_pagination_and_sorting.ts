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

/**
 * Test pagination and sorting functionality for variant snapshot lists.
 *
 * This test validates the variant snapshot listing endpoint's pagination and sorting capabilities:
 * 1. Seller creates a product with 12 variants
 * 2. Edits each variant to create snapshot history
 * 3. Retrieves variant snapshots with various pagination parameters
 * 4. Validates default pagination (20 items per page)
 * 5. Tests custom limit parameter
 * 6. Tests page navigation with different result sets
 * 7. Tests sorting by snapshot_at (asc/desc)
 * 8. Tests sorting by sku_code (asc/desc)
 * 9. Validates pagination metadata accuracy
 * 10. Tests edge case: page beyond available pages returns empty data
 */
export async function test_api_product_variant_snapshot_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      shop_name: RandomGenerator.name(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Create a product (need to get category first)
  // For this test, we'll use a randomly generated UUID for category
  // In real scenario, admin would create categories first
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 3. Create 12 variants with unique SKU codes
  const variantCount = 12;
  const variants: IShoppingMallProductVariant[] = [];
  const skuCodes: string[] = [];
  for (let i = 0; i < variantCount; i++) {
    const skuCode = `SKU-TEST-${String(i).padStart(3, "0")}-${RandomGenerator.alphabets(4).toUpperCase()}`;
    skuCodes.push(skuCode);
    const variant =
      await api.functional.shoppingMall.seller.products.variants.create(
        sellerConnection,
        {
          productId: product.id,
          body: {
            sku_code: skuCode,
            stock_quantity: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<100>
            >(),
            price: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<1000>
            >(),
            options: [
              {
                key: "color",
                value: RandomGenerator.pick(["Red", "Blue", "Green", "Black"]),
              },
              {
                key: "size",
                value: RandomGenerator.pick(["S", "M", "L", "XL"]),
              },
            ],
          } satisfies IShoppingMallProductVariant.ICreate,
        },
      );
    typia.assert(variant);
    variants.push(variant);
  }
  // 4. Edit each variant to create snapshots (edit twice for more snapshot history)
  for (let i = 0; i < variants.length; i++) {
    const variant = variants[i];
    // First edit
    await api.functional.shoppingMall.seller.sellers.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          stockQuantity: variant.stockQuantity + 5,
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
    // Small delay to ensure different snapshot timestamps
    await new Promise((resolve) => setTimeout(resolve, 10));
    // Second edit
    await api.functional.shoppingMall.seller.sellers.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          price: (variant.price ?? product.base_price) + 100,
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
    // Small delay
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  // 5. Get product snapshots to find the latest snapshot
  const productSnapshots =
    await api.functional.shoppingMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 10,
          sort: "snapshot_at,desc",
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(productSnapshots);
  TestValidator.predicate(
    "product has snapshots",
    productSnapshots.data.length > 0,
  );
  const latestSnapshot = productSnapshots.data[0];
  // 6. Test default pagination (should return up to 20 items)
  const defaultPagination =
    await api.functional.shoppingMall.seller.products.snapshots.variantSnapshots.index(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: latestSnapshot.id,
        body: {
          page: 1,
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(defaultPagination);
  TestValidator.equals(
    "default limit is 20",
    defaultPagination.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "has variant snapshots",
    defaultPagination.data.length > 0,
  );
  // 7. Test custom limit parameter
  const customLimit = 5;
  const limitedResults =
    await api.functional.shoppingMall.seller.products.snapshots.variantSnapshots.index(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: latestSnapshot.id,
        body: {
          page: 1,
          limit: customLimit,
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(limitedResults);
  TestValidator.equals(
    "custom limit respected",
    limitedResults.pagination.limit,
    customLimit,
  );
  TestValidator.predicate(
    "data length <= limit",
    limitedResults.data.length <= customLimit,
  );
  // 8. Test page navigation - get page 2
  const page2Results =
    await api.functional.shoppingMall.seller.products.snapshots.variantSnapshots.index(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: latestSnapshot.id,
        body: {
          page: 2,
          limit: customLimit,
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(page2Results);
  TestValidator.equals(
    "page 2 current page",
    page2Results.pagination.current,
    2,
  );
  // Verify page 1 and page 2 have different data (if both have data)
  if (defaultPagination.data.length > customLimit) {
    const page1Ids = defaultPagination.data
      .slice(0, customLimit)
      .map((v) => v.id);
    const page2Ids = page2Results.data.map((v) => v.id);
    const hasOverlap = page1Ids.some((id) => page2Ids.includes(id));
    TestValidator.predicate("page 1 and 2 have different data", !hasOverlap);
  }
  // 9. Test sorting by snapshot_at descending (newest first)
  const sortedBySnapshotDesc =
    await api.functional.shoppingMall.seller.products.snapshots.variantSnapshots.index(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: latestSnapshot.id,
        body: {
          page: 1,
          limit: 100,
          sort: "snapshot_at,desc",
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(sortedBySnapshotDesc);
  // Verify chronological order (desc)
  for (let i = 1; i < sortedBySnapshotDesc.data.length; i++) {
    const prev = new Date(
      sortedBySnapshotDesc.data[i - 1].snapshot_at,
    ).getTime();
    const curr = new Date(sortedBySnapshotDesc.data[i].snapshot_at).getTime();
    TestValidator.predicate(
      `snapshot_at desc order at index ${i}`,
      prev >= curr,
    );
  }
  // 10. Test sorting by snapshot_at ascending (oldest first)
  const sortedBySnapshotAsc =
    await api.functional.shoppingMall.seller.products.snapshots.variantSnapshots.index(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: latestSnapshot.id,
        body: {
          page: 1,
          limit: 100,
          sort: "snapshot_at,asc",
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(sortedBySnapshotAsc);
  // Verify chronological order (asc)
  for (let i = 1; i < sortedBySnapshotAsc.data.length; i++) {
    const prev = new Date(
      sortedBySnapshotAsc.data[i - 1].snapshot_at,
    ).getTime();
    const curr = new Date(sortedBySnapshotAsc.data[i].snapshot_at).getTime();
    TestValidator.predicate(
      `snapshot_at asc order at index ${i}`,
      prev <= curr,
    );
  }
  // 11. Test sorting by sku_code ascending
  const sortedBySkuAsc =
    await api.functional.shoppingMall.seller.products.snapshots.variantSnapshots.index(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: latestSnapshot.id,
        body: {
          page: 1,
          limit: 100,
          sort: "sku_code,asc",
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(sortedBySkuAsc);
  // Verify alphabetical order (asc)
  for (let i = 1; i < sortedBySkuAsc.data.length; i++) {
    const prev = sortedBySkuAsc.data[i - 1].sku_code;
    const curr = sortedBySkuAsc.data[i].sku_code;
    TestValidator.predicate(
      `sku_code asc order at index ${i}`,
      prev.localeCompare(curr) <= 0,
    );
  }
  // 12. Test sorting by sku_code descending
  const sortedBySkuDesc =
    await api.functional.shoppingMall.seller.products.snapshots.variantSnapshots.index(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: latestSnapshot.id,
        body: {
          page: 1,
          limit: 100,
          sort: "sku_code,desc",
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(sortedBySkuDesc);
  // Verify alphabetical order (desc)
  for (let i = 1; i < sortedBySkuDesc.data.length; i++) {
    const prev = sortedBySkuDesc.data[i - 1].sku_code;
    const curr = sortedBySkuDesc.data[i].sku_code;
    TestValidator.predicate(
      `sku_code desc order at index ${i}`,
      prev.localeCompare(curr) >= 0,
    );
  }
  // 13. Validate pagination metadata
  TestValidator.predicate(
    "total pages calculated correctly",
    defaultPagination.pagination.pages >= 1,
  );
  TestValidator.equals(
    "total records matches data count",
    defaultPagination.pagination.records,
    defaultPagination.data.length,
  );
  // 14. Test page beyond available pages returns empty data
  const totalPages = defaultPagination.pagination.pages;
  const beyondPage = totalPages + 10;
  const beyondPageResults =
    await api.functional.shoppingMall.seller.products.snapshots.variantSnapshots.index(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: latestSnapshot.id,
        body: {
          page: beyondPage,
          limit: customLimit,
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(beyondPageResults);
  TestValidator.equals(
    "beyond page returns empty data",
    beyondPageResults.data.length,
    0,
  );
  TestValidator.equals(
    "beyond page current page",
    beyondPageResults.pagination.current,
    beyondPage,
  );
  TestValidator.equals(
    "beyond page limit preserved",
    beyondPageResults.pagination.limit,
    customLimit,
  );
}
