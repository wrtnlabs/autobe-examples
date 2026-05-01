import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshotImage";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
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
import { generate_random_shopping_mall_seller_products_images_create } from "../../../generate/generate_random_shopping_mall_seller_products_images_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";

/**
 * Test that snapshot images preserve deleted source images independently.
 *
 * Validates the durable audit trail guarantee of product snapshots by verifying
 * that snapshot image records survive independently of their source product images
 * for dispute resolution. When a product image is deleted, an automatic snapshot
 * captures the complete gallery state — all image URLs and their display order
 * positions at the moment before deletion.
 *
 * Each snapshot image references its original product image via the originalImage
 * field. When the source product image is later deleted, the snapshot image retains
 * its own denormalized image_url and display_order while the originalImage becomes
 * null, clearly recording that the original no longer exists. Non-deleted images
 * maintain valid non-null originalImage references.
 *
 * 1. Administrator joins and creates a product category.
 * 2. Seller joins, administrator approves the seller registration.
 * 3. Seller creates a product and uploads three gallery images.
 * 4. Seller deletes the second image, triggering an automatic product snapshot.
 * 5. Retrieves the snapshot images and validates all three images are preserved
 *    including the deleted image with its captured image_url and display_order.
 * 6. Verifies the deleted image's originalImage is null while remaining non-deleted
 *    images retain valid originalImage references pointing to existing product images.
 * 7. Confirms the total snapshot image count equals the pre-deletion gallery size.
 */
export async function test_api_snapshot_images_deleted_source_preservation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Seller registration and approval
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: seller.id,
  });
  // 3. Product creation with three gallery images
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: { shopping_mall_category_id: category.id },
    },
  );
  typia.assert(product);
  const image1 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  typia.assert(image1);
  const image2 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  typia.assert(image2);
  const image3 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  typia.assert(image3);
  // 4. Delete the second image — triggers automatic product snapshot
  await api.functional.shoppingMall.seller.products.images.erase(
    sellerConnection,
    {
      productId: product.id,
      imageId: image2.id,
    },
  );
  // 5. Retrieve snapshot images via the index endpoint
  const snapshotImages =
    await api.functional.shoppingMall.seller.products.snapshots.images.index(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
        body: {},
      },
    );
  typia.assert(snapshotImages);
  // 6. Validate snapshot image count includes all pre-deletion images
  TestValidator.equals(
    "snapshot preserves all three images including deleted one",
    snapshotImages.data.length,
    3,
  );
  // 7. Find and validate the deleted image snapshot record
  const snapshotImageOfDeleted = snapshotImages.data.find(
    (si) => si.image_url === image2.image_url,
  );
  TestValidator.predicate(
    "deleted source image is preserved in snapshot",
    snapshotImageOfDeleted !== undefined,
  );
  if (snapshotImageOfDeleted !== undefined) {
    TestValidator.equals(
      "deleted image originalImage is null (source no longer exists)",
      snapshotImageOfDeleted.originalImage,
      null,
    );
  }
  // 8. Find and validate remaining non-deleted image snapshot records
  const snapshotImageOfImage1 = snapshotImages.data.find(
    (si) => si.image_url === image1.image_url,
  );
  TestValidator.predicate(
    "non-deleted image 1 is preserved in snapshot",
    snapshotImageOfImage1 !== undefined,
  );
  if (snapshotImageOfImage1 !== undefined) {
    TestValidator.predicate(
      "non-deleted image 1 retains valid originalImage reference",
      snapshotImageOfImage1.originalImage !== null,
    );
  }
  const snapshotImageOfImage3 = snapshotImages.data.find(
    (si) => si.image_url === image3.image_url,
  );
  TestValidator.predicate(
    "non-deleted image 3 is preserved in snapshot",
    snapshotImageOfImage3 !== undefined,
  );
  if (snapshotImageOfImage3 !== undefined) {
    TestValidator.predicate(
      "non-deleted image 3 retains valid originalImage reference",
      snapshotImageOfImage3.originalImage !== null,
    );
  }
  // 9. Validate display order integrity
  TestValidator.predicate(
    "snapshot images maintain contiguous display order range",
    snapshotImages.data.every(
      (si) => si.display_order >= 0 && si.display_order <= 2,
    ),
  );
}
