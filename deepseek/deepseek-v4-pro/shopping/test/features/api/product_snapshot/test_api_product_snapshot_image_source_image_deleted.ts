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
 * Test snapshot image record survival after the source product image is deleted.
 *
 * Validates that a product snapshot image — captured automatically when a seller edits their product — remains fully accessible through admin endpoints even after the seller deletes the original image from the live product gallery. The snapshot preserves the frozen image URL and gallery display order as denormalized data, while the foreign key reference to the now-deleted source image is properly cleared to null.
 *
 * This test confirms the snapshot-based audit trail architecture: denormalized data ensures historical integrity independent of live record lifecycles. Administrators can retrieve any snapshot image for dispute resolution or historical reference regardless of subsequent gallery changes.
 *
 * 1. Administrator registers and authenticates.
 * 2. Seller registers and authenticates; admin approves the seller.
 * 3. Seller creates a product.
 * 4. Seller uploads an image to the product gallery — this image becomes the source for the snapshot.
 * 5. Seller edits the product to trigger an automatic snapshot capturing the image state.
 * 6. Seller deletes the original image from the live gallery.
 * 7. Admin lists product snapshots to obtain the snapshot identifier.
 * 8. Admin lists snapshot images to obtain the snapshot image identifier.
 * 9. Admin retrieves the individual snapshot image record via `GET /admin/products/{productId}/snapshots/{snapshotId}/images/{imageId}`.
 * 10. Validates that imageUrl and displayOrder are preserved and that shoppingMallProductImageId is null.
 */
export async function test_api_product_snapshot_image_source_image_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Seller setup and admin approval
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: seller.id,
  });
  // 3. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 4. Seller uploads an image to the product gallery
  const productImage =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  typia.assert(productImage);
  // 5. Seller edits the product — triggers snapshot creation capturing image state
  await api.functional.shoppingMall.seller.products.update(sellerConnection, {
    productId: product.id,
    body: {
      name: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.content({ paragraphs: 2 }),
      shopping_mall_category_id: product.category.id,
      base_price: typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1>
      >() satisfies number as number,
    } satisfies IShoppingMallProduct.IUpdate,
  });
  // 6. Seller deletes the original image from the live gallery
  await api.functional.shoppingMall.seller.products.images.erase(
    sellerConnection,
    {
      productId: product.id,
      imageId: productImage.id,
    },
  );
  // 7. Admin lists product snapshots
  const snapshotsPage =
    await api.functional.shoppingMall.admin.products.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        body: {},
      },
    );
  typia.assert(snapshotsPage);
  const snapshot = snapshotsPage.data[0];
  // 8. Admin lists snapshot images
  const snapshotImagesPage =
    await api.functional.shoppingMall.admin.products.snapshots.images.index(
      adminConnection,
      {
        productId: product.id,
        snapshotId: snapshot.id,
        body: {},
      },
    );
  typia.assert(snapshotImagesPage);
  const snapshotImageSummary = snapshotImagesPage.data[0];
  // 9. Admin retrieves the individual snapshot image record
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
  // 10. Validate denormalized data preserved, foreign key cleared
  TestValidator.equals(
    "frozen image URL matches original",
    snapshotImage.imageUrl,
    productImage.image_url satisfies string as string,
  );
  TestValidator.equals(
    "frozen display order matches original",
    snapshotImage.displayOrder,
    productImage.display_order,
  );
  TestValidator.equals(
    "shoppingMallProductImageId is null after source image deletion",
    snapshotImage.shoppingMallProductImageId,
    null,
  );
}
