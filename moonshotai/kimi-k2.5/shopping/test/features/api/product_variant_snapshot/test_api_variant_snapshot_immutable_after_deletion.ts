import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import type { IEcommerceMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshotOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariantSnapshot";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

/**
 * Verify that variant snapshots remain accessible even after the parent product
 * or variant has been deleted, ensuring immutable audit trail preservation.
 *
 * Prerequisites: Authenticate, create product, create variant, edit to create
 * snapshot, delete the product/variant.
 *
 * Test Steps:
 * 1. Authenticate as admin
 * 2. Create a category
 * 3. Authenticate as seller
 * 4. Create test product
 * 5. Create variant to be deleted
 * 6. Edit variant to create snapshot
 * 7. List snapshots to get snapshotId
 * 8. Delete the variant
 * 9. Retrieve the same snapshot using the admin endpoint
 *
 * Validation Points:
 * - Snapshot is still retrievable even though variant no longer exists
 * - Snapshot data includes historical SKU code, price, and option values
 * - Response structure matches IEcommerceMallProductVariantSnapshot schema
 * - Snapshot integrity preserved independent of current product state
 */
export async function test_api_variant_snapshot_immutable_after_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: IEcommerceMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {},
  );
  typia.assert(adminAuth);
  // 2. Create a category
  const category: IEcommerceMallCategory =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 3. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth: IEcommerceMallSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 4. Create test product
  const product: IEcommerceMallProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          categoryId: category.id,
        },
      },
    );
  typia.assert(product);
  // 5. Create variant to be deleted
  const originalSkuCode = RandomGenerator.alphaNumeric(8).toUpperCase();
  const originalPrice = typia.random<number & tags.Minimum<100>>();
  const variant: IEcommerceMallProductVariant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: originalSkuCode,
          price: (originalPrice satisfies number as number),
          stock: 100,
        },
      },
    );
  typia.assert(variant);
  // 6. Edit variant to create snapshot
  const updatedSkuCode = RandomGenerator.alphaNumeric(8).toUpperCase();
  const updatedPrice = originalPrice + 50;
  const updatedVariant: IEcommerceMallProductVariant =
    await api.functional.ecommerceMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          skuCode: updatedSkuCode,
          price: updatedPrice,
        } satisfies IEcommerceMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // 7. List snapshots to get snapshotId
  const snapshotsPage =
    await api.functional.ecommerceMall.seller.products.variants.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsPage);
  TestValidator.predicate(
    "snapshots should contain at least one record",
    snapshotsPage.data.length >= 1,
  );
  const snapshotId = snapshotsPage.data[0]!.id;
  const capturedSkuCode = snapshotsPage.data[0]!.skuCode;
  const capturedPrice = snapshotsPage.data[0]!.price;
  // 8. Delete the variant
  await api.functional.ecommerceMall.seller.products.variants.erase(
    sellerConnection,
    {
      productId: product.id,
      variantId: variant.id,
    },
  );
  // 9. Retrieve the same snapshot using admin endpoint
  // Even after variant deletion, snapshot should still be accessible
  const retrievedSnapshot: IEcommerceMallProductVariantSnapshot =
    await api.functional.ecommerceMall.admin.products.variants.snapshots.at(
      adminConnection,
      {
        productId: product.id,
        variantId: variant.id,
        snapshotId: snapshotId,
      },
    );
  typia.assert(retrievedSnapshot);
  // Validation: Snapshot data integrity preserved even after variant deletion
  TestValidator.equals(
    "snapshot SKU code should match original captured value",
    retrievedSnapshot.skuCode,
    capturedSkuCode,
  );
  TestValidator.equals(
    "snapshot price should match original captured value",
    retrievedSnapshot.price,
    capturedPrice,
  );
  TestValidator.equals(
    "snapshot ID should match",
    retrievedSnapshot.id,
    snapshotId,
  );
  TestValidator.equals(
    "snapshot productVariantId should match original variant ID",
    retrievedSnapshot.productVariantId,
    variant.id,
  );
  // Verify snapshot captured historical state (original values before update)
  TestValidator.equals(
    "snapshot should preserve original SKU code",
    retrievedSnapshot.skuCode,
    originalSkuCode,
  );
  TestValidator.equals(
    "snapshot should preserve original price",
    retrievedSnapshot.price,
    originalPrice,
  );
}
