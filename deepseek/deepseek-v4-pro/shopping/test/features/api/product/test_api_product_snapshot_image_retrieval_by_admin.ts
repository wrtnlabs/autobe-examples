import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IPageIShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshotImage";
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
import { generate_random_shopping_mall_seller_products_images_create } from "../../../generate/generate_random_shopping_mall_seller_products_images_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";

/**
 * Test that an admin can retrieve a single product snapshot image from edit history.
 *
 * Validates the complete workflow from product creation through snapshot generation to individual snapshot image retrieval. Ensures that snapshot images faithfully capture the frozen gallery state — image URL, display order, and original image reference — at the moment of snapshot creation.
 *
 * Special attention is given to verifying that the snapshot image's fields (imageUrl, displayOrder) match the live product image's values at snapshot time, that the shoppingMallProductImageId correctly references the still-existing original image, and that the createdAt timestamp aligns with the parent snapshot's creation time.
 *
 * 1. Admin registers and authenticates via authorize_admin_join.
 * 2. Seller registers and authenticates via authorize_seller_join.
 * 3. Admin approves the seller so they can create products.
 * 4. Seller creates a product with random data.
 * 5. Seller uploads an image to the product's gallery.
 * 6. Seller edits the product (PUT) to trigger automatic snapshot creation capturing the image state.
 * 7. Admin lists product snapshots to obtain the snapshotId.
 * 8. Admin lists snapshot images to obtain the imageId.
 * 9. Admin retrieves the specific snapshot image (target GET endpoint).
 * 10. Validates imageUrl, displayOrder, shoppingMallProductImageId, and createdAt against expected values.
 */
export async function test_api_product_snapshot_image_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  // 2. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 3. Admin approves the seller
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: seller.id,
  });
  // 4. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 5. Seller uploads an image to the product's gallery
  const uploadedImage =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(uploadedImage);
  // 6. Seller edits the product to trigger automatic snapshot creation
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: product.id,
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_mall_category_id: product.category.id,
        base_price: 9999,
      } satisfies IShoppingMallProduct.IUpdate,
    });
  typia.assert(updatedProduct);
  // 7. Admin lists product snapshots to obtain snapshotId
  const snapshotPage =
    await api.functional.shoppingMall.admin.products.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(snapshotPage);
  TestValidator.predicate(
    "snapshots exist after product edit",
    snapshotPage.data.length > 0,
  );
  const snapshot = snapshotPage.data[0];
  // 8. Admin lists snapshot images to obtain imageId
  const imagePage =
    await api.functional.shoppingMall.admin.products.snapshots.images.index(
      adminConnection,
      {
        productId: product.id,
        snapshotId: snapshot.id,
        body: {} satisfies IShoppingMallProductSnapshotImage.IRequest,
      },
    );
  typia.assert(imagePage);
  TestValidator.predicate("snapshot images exist", imagePage.data.length > 0);
  const snapshotImageSummary = imagePage.data[0];
  // 9. Admin retrieves the specific snapshot image (target operation)
  const snapshotImage =
    await api.functional.shoppingMall.admin.products.snapshots.images.at(
      adminConnection,
      {
        productId: product.id,
        snapshotId: snapshot.id,
        imageId: snapshotImageSummary.id,
      },
    );
  typia.assert(snapshotImage);
  // 10. Validate the snapshot image response
  TestValidator.equals(
    "frozen image url matches gallery state at snapshot time",
    snapshotImage.imageUrl,
    uploadedImage.image_url satisfies string as string,
  );
  TestValidator.equals(
    "frozen display order matches gallery state at snapshot time",
    snapshotImage.displayOrder,
    uploadedImage.display_order,
  );
  TestValidator.predicate(
    "shoppingMallProductImageId is non-null and references still-existing original image",
    snapshotImage.shoppingMallProductImageId !== null,
  );
  if (snapshotImage.shoppingMallProductImageId !== null) {
    TestValidator.equals(
      "shoppingMallProductImageId references correct original product image",
      snapshotImage.shoppingMallProductImageId,
      uploadedImage.id,
    );
  }
  TestValidator.equals(
    "createdAt matches parent snapshot creation time",
    snapshotImage.createdAt,
    snapshot.created_at,
  );
}
