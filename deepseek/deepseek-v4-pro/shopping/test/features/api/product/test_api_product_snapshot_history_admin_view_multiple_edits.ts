import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
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
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test that an administrator can retrieve the complete paginated snapshot history
 * of a product that has been edited multiple times by its seller.
 *
 * Validates the full snapshot audit trail workflow: a seller creates a product,
 * edits it twice with different core attributes, and an administrator retrieves
 * the snapshot list. Ensures that exactly two snapshots are returned in
 * descending chronological order (newest first), each capturing the product's
 * name, description, category, base price, image gallery, and variant states as
 * they existed before the corresponding edit.
 *
 * Special attention is given to verifying pagination metadata accuracy and that
 * snapshotImages and variantSnapshots arrays are present — even when empty —
 * confirming the snapshot structure is complete regardless of whether images or
 * variants had been configured at the time of the edit.
 *
 * 1. Administrator registers and authenticates via join.
 * 2. Administrator creates a product category for the test.
 * 3. Seller registers and authenticates via join.
 * 4. Administrator approves the seller's pending registration.
 * 5. Seller creates a product under the category created in step 2.
 * 6. Seller performs the first edit — changing name, description, and base price.
 * 7. Seller performs the second edit — changing them again.
 * 8. Administrator queries the snapshot history with default pagination.
 * 9. Validates record count, ordering, content fidelity, and pagination metadata.
 */
export async function test_api_product_snapshot_history_admin_view_multiple_edits(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  // 2. Admin creates a category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 3. Seller join
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 4. Admin approves seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: seller.id,
    });
  typia.assert(approvedSeller);
  TestValidator.equals(
    "seller approval status",
    approvedSeller.approval_status,
    "approved",
  );
  // 5. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: { shopping_mall_category_id: category.id } },
  );
  typia.assert(product);
  const originalName = product.name;
  const originalDescription = product.description;
  const originalBasePrice = product.base_price;
  // 6. First edit
  const firstEditName = RandomGenerator.paragraph({ sentences: 3 });
  const firstEditDescription = RandomGenerator.content({ paragraphs: 2 });
  const firstEditPrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1>
  >() satisfies number as number;
  const updated1 = await api.functional.shoppingMall.seller.products.update(
    sellerConnection,
    {
      productId: product.id,
      body: {
        name: firstEditName,
        description: firstEditDescription,
        shopping_mall_category_id: category.id,
        base_price: firstEditPrice,
      } satisfies IShoppingMallProduct.IUpdate,
    },
  );
  typia.assert(updated1);
  // 7. Second edit
  const secondEditName = RandomGenerator.paragraph({ sentences: 2 });
  const secondEditDescription = RandomGenerator.content({ paragraphs: 3 });
  const secondEditPrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1>
  >() satisfies number as number;
  const updated2 = await api.functional.shoppingMall.seller.products.update(
    sellerConnection,
    {
      productId: product.id,
      body: {
        name: secondEditName,
        description: secondEditDescription,
        shopping_mall_category_id: category.id,
        base_price: secondEditPrice,
      } satisfies IShoppingMallProduct.IUpdate,
    },
  );
  typia.assert(updated2);
  // 8. Admin queries snapshot history
  const snapshots =
    await api.functional.shoppingMall.admin.products.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        body: {} satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 9. Validation
  const { pagination, data } = snapshots;
  TestValidator.equals("total snapshot records", pagination.records, 2);
  TestValidator.equals("data array length", data.length, 2);
  TestValidator.equals("current page", pagination.current, 1);
  TestValidator.predicate("has at least one page", pagination.pages >= 1);
  TestValidator.predicate("limit is positive", pagination.limit > 0);
  // Newest first ordering
  TestValidator.predicate(
    "snapshots ordered newest first",
    data[0].created_at > data[1].created_at,
  );
  const newestSnapshot = data[0];
  const oldestSnapshot = data[1];
  // Oldest snapshot (first edit → captures original state)
  TestValidator.equals(
    "oldest snapshot name matches original",
    oldestSnapshot.name,
    originalName,
  );
  TestValidator.equals(
    "oldest snapshot description matches original",
    oldestSnapshot.description,
    originalDescription,
  );
  TestValidator.equals(
    "oldest snapshot base_price matches original",
    oldestSnapshot.base_price,
    originalBasePrice,
  );
  // Newest snapshot (second edit → captures state after first edit)
  TestValidator.equals(
    "newest snapshot name matches first edit",
    newestSnapshot.name,
    firstEditName,
  );
  TestValidator.equals(
    "newest snapshot description matches first edit",
    newestSnapshot.description,
    firstEditDescription,
  );
  TestValidator.equals(
    "newest snapshot base_price matches first edit",
    newestSnapshot.base_price,
    firstEditPrice,
  );
  // Category preserved in both snapshots
  TestValidator.predicate(
    "oldest snapshot has category",
    oldestSnapshot.category !== null,
  );
  TestValidator.equals(
    "oldest snapshot category id",
    oldestSnapshot.category!.id,
    category.id,
  );
  TestValidator.predicate(
    "newest snapshot has category",
    newestSnapshot.category !== null,
  );
  TestValidator.equals(
    "newest snapshot category id",
    newestSnapshot.category!.id,
    category.id,
  );
  // Image and variant snapshots present (empty since none were added)
  TestValidator.equals(
    "oldest snapshot images empty",
    oldestSnapshot.snapshotImages.length,
    0,
  );
  TestValidator.equals(
    "oldest snapshot variants empty",
    oldestSnapshot.variantSnapshots.length,
    0,
  );
  TestValidator.equals(
    "newest snapshot images empty",
    newestSnapshot.snapshotImages.length,
    0,
  );
  TestValidator.equals(
    "newest snapshot variants empty",
    newestSnapshot.variantSnapshots.length,
    0,
  );
  // Snapshot IDs are unique
  TestValidator.notEquals(
    "snapshot IDs differ",
    newestSnapshot.id,
    oldestSnapshot.id,
  );
}
