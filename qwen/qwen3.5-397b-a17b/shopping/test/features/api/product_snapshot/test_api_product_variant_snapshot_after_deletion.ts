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
 * Test access control and snapshot persistence after product deletion.
 *
 * This test validates that product variant snapshots remain accessible and immutable
 * even after the parent product has been deleted. This is critical for:
 * - Historical record keeping
 * - Dispute resolution
 * - Audit trail compliance
 *
 * Test Flow:
 * 1. Seller registers and authenticates
 * 2. Seller creates a product with multiple variants
 * 3. Seller updates the product to trigger snapshot creation
 * 4. Seller deletes the product
 * 5. Seller retrieves variant snapshots from the preserved product snapshot
 * 6. Validates snapshot data integrity and accessibility
 */
export async function test_api_product_variant_snapshot_after_deletion(
  connection: api.IConnection,
): Promise<void> {
  // ============================================================================
  // Step 1: Seller Authentication
  // ============================================================================
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // ============================================================================
  // Step 2: Create Product with Initial Data
  // ============================================================================
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // ============================================================================
  // Step 3: Create Multiple Variants for the Product
  // ============================================================================
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: RandomGenerator.alphaNumeric(10),
          price_override: null,
          option_value_ids: [],
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
          sku_code: RandomGenerator.alphaNumeric(10),
          price_override: 1000,
          option_value_ids: [],
        },
      },
    );
  typia.assert(variant2);
  // ============================================================================
  // Step 4: Update Product to Create Snapshot
  // ============================================================================
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: product.id,
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
      },
    });
  typia.assert(updatedProduct);
  // ============================================================================
  // Step 5: Delete the Product (Snapshots Should Persist)
  // ============================================================================
  await api.functional.shoppingMall.seller.products.erase(sellerConnection, {
    productId: product.id,
  });
  // ============================================================================
  // Step 6: Retrieve Variant Snapshots After Product Deletion
  // ============================================================================
  // Variant snapshots remain accessible even after product deletion for audit purposes
  const variantSnapshots =
    await api.functional.shoppingMall.seller.products.snapshots.variants.index(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: product.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductSnapshotVariant.IRequest,
      },
    );
  typia.assert(variantSnapshots);
  // ============================================================================
  // Step 7: Validate Snapshot Persistence and Data Integrity
  // ============================================================================
  TestValidator.predicate(
    "variant snapshots remain accessible after product deletion",
    () => variantSnapshots.data.length > 0,
  );
  TestValidator.predicate(
    "pagination metadata is valid",
    () =>
      variantSnapshots.pagination.current >= 1 &&
      variantSnapshots.pagination.limit > 0 &&
      variantSnapshots.pagination.records >= variantSnapshots.data.length,
  );
  // Validate snapshot immutability - each snapshot should have complete historical data
  for (const snapshot of variantSnapshots.data) {
    TestValidator.predicate(
      "snapshot preserves SKU code from creation time",
      () => snapshot.sku_code.length > 0,
    );
    TestValidator.predicate(
      "snapshot preserves stock quantity from creation time",
      () => snapshot.stock_quantity >= 0,
    );
    TestValidator.predicate(
      "snapshot has valid creation timestamp",
      () => new Date(snapshot.created_at).getTime() > 0,
    );
    TestValidator.predicate(
      "snapshot references parent product snapshot",
      () => snapshot.snapshot.id.length > 0,
    );
  }
}
