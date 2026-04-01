import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
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
 * Test that variant snapshots remain accessible even after the parent product and variant are deleted.
 * This validates the snapshot preservation business rule that snapshots are immutable and preserved
 * for audit/dispute resolution even after source entities are deleted.
 *
 * Test flow:
 * 1. Authenticate as a seller
 * 2. Create a product with a variant
 * 3. Edit the product to create a snapshot
 * 4. Capture the snapshotId and variantSnapshotId before deletion
 * 5. Delete the product (which also deletes all variants)
 * 6. Retrieve the variant snapshot using the captured IDs
 * 7. Verify the snapshot is still accessible and returns the preserved state
 * 8. Verify all fields (id, sku_code, price_override, stock_quantity, created_at) are present
 */
export async function test_api_product_variant_snapshot_after_product_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
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
  // 2. Create a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create a variant for the product
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(variant);
  // 4. Edit the product to trigger snapshot creation
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: product.id,
      body: {
        name: `${product.name} - Updated`,
      } satisfies IShoppingMallProduct.IUpdate,
    });
  typia.assert(updatedProduct);
  // 5. List product snapshots to capture snapshotId
  const snapshots =
    await api.functional.shoppingMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  TestValidator.predicate("snapshots exist", snapshots.data.length > 0);
  // Get the most recent snapshot (first in list, sorted by created_at DESC)
  const snapshot = snapshots.data[0]!;
  const snapshotId = snapshot.id;
  // 6. List variant snapshots to capture variantSnapshotId
  const variantSnapshots =
    await api.functional.shoppingMall.seller.products.snapshots.variants.index(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: snapshotId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductSnapshotVariant.IRequest,
      },
    );
  typia.assert(variantSnapshots);
  TestValidator.predicate(
    "variant snapshots exist",
    variantSnapshots.data.length > 0,
  );
  // Get the variant snapshot
  const variantSnapshot = variantSnapshots.data[0]!;
  const variantSnapshotId = variantSnapshot.id;
  // Store expected values before deletion
  const expectedSkuCode = variantSnapshot.sku_code;
  const expectedPriceOverride = variantSnapshot.price_override;
  const expectedStockQuantity = variantSnapshot.stock_quantity;
  const expectedCreatedAt = variantSnapshot.created_at;
  // 7. Delete the product (which also deletes all variants)
  await api.functional.shoppingMall.seller.products.erase(sellerConnection, {
    productId: product.id,
  });
  // 8. Retrieve the variant snapshot after product deletion
  // This should still work because snapshots are immutable and preserved
  const retrievedVariantSnapshot =
    await api.functional.shoppingMall.seller.products.snapshots.variants.at(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: snapshotId,
        variantSnapshotId: variantSnapshotId,
      },
    );
  typia.assert(retrievedVariantSnapshot);
  // 9. Verify all fields are present and contain the historical values
  TestValidator.equals(
    "sku_code preserved",
    retrievedVariantSnapshot.sku_code,
    expectedSkuCode,
  );
  TestValidator.equals(
    "price_override preserved",
    retrievedVariantSnapshot.price_override,
    expectedPriceOverride,
  );
  TestValidator.equals(
    "stock_quantity preserved",
    retrievedVariantSnapshot.stock_quantity,
    expectedStockQuantity,
  );
  TestValidator.equals(
    "created_at preserved",
    retrievedVariantSnapshot.created_at,
    expectedCreatedAt,
  );
  TestValidator.equals(
    "id preserved",
    retrievedVariantSnapshot.id,
    variantSnapshotId,
  );
}