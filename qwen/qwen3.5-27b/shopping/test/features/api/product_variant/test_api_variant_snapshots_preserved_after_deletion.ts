import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallVariantSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantSnapshot";
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
 * Test that variant snapshots remain accessible and preserved even after the variant is soft-deleted.
 *
 * Validates the audit trail integrity for dispute resolution by ensuring that historical variant snapshots are preserved and retrievable after the variant itself is deleted. This test creates a product variant, performs multiple updates to generate snapshots, deletes the variant, and then verifies that all snapshots remain accessible with their complete data including SKU code, price, and timestamps.
 *
 * The test ensures that the snapshot system maintains a complete modification history even when the source variant no longer exists in active state, which is critical for legal compliance and customer dispute resolution.
 *
 * 1. Seller registers and authenticates to the platform.
 * 2. Seller creates a product with name, description, and base price.
 * 3. Seller creates a variant for the product with SKU code, options, and initial stock.
 * 4. Seller updates the variant multiple times (3 updates) to create snapshots with different SKU codes and prices.
 * 5. Seller deletes the variant (soft delete operation).
 * 6. Seller retrieves all snapshots for the deleted variant.
 * 7. Validates that snapshots are still accessible and contain complete historical data.
 * 8. Validates that snapshot count matches the number of updates performed.
 * 9. Validates that each snapshot has unique timestamps and correct data values.
 */
export async function test_api_variant_snapshots_preserved_after_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {},
  });
  // 2. Create a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(product);
  // 3. Create a variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {},
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 4. Update variant multiple times to create snapshots
  const update1 =
    await api.functional.shoppingMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          sku_code: `UPDATED-SKU-001-${RandomGenerator.alphabets(6)}`,
          price: 15000,
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  typia.assert(update1);
  const update2 =
    await api.functional.shoppingMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          sku_code: `UPDATED-SKU-002-${RandomGenerator.alphabets(6)}`,
          price: 20000,
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  typia.assert(update2);
  const update3 =
    await api.functional.shoppingMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          sku_code: `UPDATED-SKU-003-${RandomGenerator.alphabets(6)}`,
          price: 25000,
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  typia.assert(update3);
  // 5. Delete the variant (soft delete)
  await api.functional.shoppingMall.seller.products.variants.erase(
    sellerConnection,
    {
      productId: product.id,
      variantId: variant.id,
    },
  );
  // 6. Retrieve snapshots for the deleted variant
  const snapshotsResponse =
    await api.functional.shoppingMall.seller.products.variants.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          limit: 100,
        } satisfies IShoppingMallVariantSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  // 7. Validate snapshots are accessible after deletion
  TestValidator.predicate(
    "snapshots accessible after variant deletion",
    snapshotsResponse.data.length > 0,
  );
  // 8. Validate snapshot count matches number of updates (3 updates = 3 snapshots)
  TestValidator.equals(
    "snapshot count matches update count",
    snapshotsResponse.data.length,
    3,
  );
  // 9. Validate each snapshot has unique timestamps
  const timestamps = snapshotsResponse.data.map((s) => s.created_at);
  const uniqueTimestamps = new Set(timestamps);
  TestValidator.equals(
    "all snapshots have unique timestamps",
    uniqueTimestamps.size,
    snapshotsResponse.data.length,
  );
  // 10. Validate snapshots are sorted by created_at descending (newest first)
  TestValidator.predicate("snapshots sorted by created_at descending", () => {
    for (let i = 1; i < timestamps.length; i++) {
      if (new Date(timestamps[i - 1]) <= new Date(timestamps[i])) {
        return false;
      }
    }
    return true;
  });
  // 11. Validate snapshot data integrity - SKU codes match update sequence
  TestValidator.equals(
    "first snapshot has update3 SKU code",
    snapshotsResponse.data[0].sku_code,
    update3.sku_code,
  );
  TestValidator.equals(
    "second snapshot has update2 SKU code",
    snapshotsResponse.data[1].sku_code,
    update2.sku_code,
  );
  TestValidator.equals(
    "third snapshot has update1 SKU code",
    snapshotsResponse.data[2].sku_code,
    update1.sku_code,
  );
  // 12. Validate snapshot prices match update sequence
  TestValidator.equals(
    "first snapshot has price 25000",
    snapshotsResponse.data[0].price,
    25000,
  );
  TestValidator.equals(
    "second snapshot has price 20000",
    snapshotsResponse.data[1].price,
    20000,
  );
  TestValidator.equals(
    "third snapshot has price 15000",
    snapshotsResponse.data[2].price,
    15000,
  );
  // 13. Validate productVariant reference in snapshots still returns data
  for (const snapshot of snapshotsResponse.data) {
    TestValidator.predicate(
      `snapshot ${snapshot.id} has productVariant reference`,
      snapshot.productVariant.id !== undefined,
    );
    TestValidator.equals(
      `snapshot ${snapshot.id} productVariant ID matches variant ID`,
      snapshot.productVariant.id,
      variant.id,
    );
  }
  // 14. Validate pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    snapshotsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination records matches snapshot count",
    snapshotsResponse.pagination.records,
    snapshotsResponse.data.length,
  );
  TestValidator.predicate(
    "pagination pages is at least 1",
    snapshotsResponse.pagination.pages >= 1,
  );
}
