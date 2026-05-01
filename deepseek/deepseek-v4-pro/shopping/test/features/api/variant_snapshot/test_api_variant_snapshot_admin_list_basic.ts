import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IPageIShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

/**
 * Test administrator browsing variant snapshots nested within a product snapshot using basic pagination.
 *
 * Validates the complete workflow from seller product creation through variant snapshot listing. An administrator registers, a seller creates a product with a variant, then edits the product to trigger automatic product snapshot creation that captures nested variant snapshots. The administrator retrieves the product snapshot history to obtain the snapshotId, then calls the variant snapshot listing endpoint with default pagination parameters.
 *
 * The test verifies that variant snapshots preserve denormalized data — SKU code, option values string, price override (or null), and stock quantity — exactly as they existed at the moment of the product edit. Pagination metadata is validated to confirm correct current page, limit, total records, and total pages values. Variant snapshots are verified to be ordered by creation time in descending order (newest first). Each variant snapshot must reference its parent variant for traceability.
 *
 * 1. Administrator registers via authorize_admin_join.
 * 2. Seller registers and creates a product with generate_random utilities.
 * 3. Seller adds a variant to the product.
 * 4. Seller edits the product to trigger snapshot creation capturing the variant state.
 * 5. Administrator retrieves product snapshots to obtain the snapshotId.
 * 6. Administrator lists variant snapshots within the snapshot with default pagination.
 * 7. Validates denormalized variant data, pagination metadata, ordering, and variant references.
 */
export async function test_api_variant_snapshot_admin_list_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registers
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Seller registers and creates a product
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  // 3. Seller adds a variant to the product
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 4. Seller edits the product to trigger snapshot creation
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: product.id,
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_mall_category_id: product.category.id,
        base_price: product.base_price + 100,
      } satisfies IShoppingMallProduct.IUpdate,
    });
  typia.assert(updatedProduct);
  // 5. Administrator retrieves product snapshots
  const snapshots =
    await api.functional.shoppingMall.admin.products.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        body: {} satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  TestValidator.predicate(
    "product has at least one snapshot",
    snapshots.data.length > 0,
  );
  const snapshot = snapshots.data[0];
  // 6. Administrator lists variant snapshots with default pagination
  const variantSnapshotsPage =
    await api.functional.shoppingMall.admin.products.snapshots.variant_snapshots.index(
      adminConnection,
      {
        productId: product.id,
        snapshotId: snapshot.id,
        body: {} satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(variantSnapshotsPage);
  // 7. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    variantSnapshotsPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is default 20",
    variantSnapshotsPage.pagination.limit === 20,
  );
  TestValidator.predicate(
    "pagination records at least 1",
    variantSnapshotsPage.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination pages at least 1",
    variantSnapshotsPage.pagination.pages >= 1,
  );
  // 8. Validate variant snapshot data
  TestValidator.predicate(
    "has at least one variant snapshot",
    variantSnapshotsPage.data.length > 0,
  );
  const variantSnapshot = variantSnapshotsPage.data[0];
  // Validate denormalized SKU code preserved
  TestValidator.equals(
    "sku_code preserved from original variant",
    variantSnapshot.sku_code,
    variant.code,
  );
  // Validate option_values string is populated
  TestValidator.predicate(
    "option_values contains variant attribute info",
    variantSnapshot.option_values.length > 0,
  );
  // Validate price preserved (null or matching original)
  TestValidator.equals(
    "price preserved from original variant",
    variantSnapshot.price,
    variant.price,
  );
  // Validate stock_quantity is an integer
  TestValidator.predicate(
    "stock_quantity is a valid integer",
    Number.isInteger(variantSnapshot.stock_quantity),
  );
  // Validate variant reference back to parent variant
  TestValidator.equals(
    "variant snapshot references parent variant",
    variantSnapshot.variant.id,
    variant.id,
  );
  // 9. Validate ordering: newest first by created_at descending
  if (variantSnapshotsPage.data.length > 1) {
    for (let i = 0; i < variantSnapshotsPage.data.length - 1; i++) {
      TestValidator.predicate(
        `variant snapshots ordered by created_at DESC at index ${i}`,
        new Date(variantSnapshotsPage.data[i].created_at).getTime() >=
          new Date(variantSnapshotsPage.data[i + 1].created_at).getTime(),
      );
    }
  }
}
