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
 * Verifies that snapshot images remain fully accessible after product deletion.
 *
 * Tests that product snapshot images are durable audit records that survive entity deletion. When a seller creates a product with images, edits it to trigger a snapshot, and an administrator subsequently deletes the entire product, the frozen snapshot images must remain retrievable with all their preserved data intact.
 *
 * This validates the snapshot preservation rule: snapshot records (including snapshot images) must outlive their parent product records. Even after the product and its live images are removed from the active catalog, the snapshot image's URL, display order, and creation timestamp must be preserved unchanged.
 *
 * 1. Seller registers and gets approved by an administrator.
 * 2. Seller creates a product with a gallery image.
 * 3. Seller edits the product to trigger an automatic snapshot.
 * 4. Administrator deletes the product entirely.
 * 5. Administrator lists snapshots of the deleted product.
 * 6. Administrator lists snapshot images within the snapshot.
 * 7. Administrator retrieves a specific snapshot image by ID.
 * 8. Validates the snapshot image URL, display order, and timestamp are preserved as frozen audit records.
 */
export async function test_api_product_snapshot_image_after_product_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 2. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  // 3. Admin approves seller
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: seller.id,
  });
  // 4. Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 5. Seller uploads image to product gallery
  const image =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(image);
  // 6. Seller edits product to trigger automatic snapshot creation
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: product.id,
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        shopping_mall_category_id: product.category.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1>
        >(),
      } satisfies IShoppingMallProduct.IUpdate,
    });
  typia.assert(updatedProduct);
  // 7. Admin deletes the entire product
  await api.functional.shoppingMall.admin.products.erase(adminConnection, {
    productId: product.id,
  });
  // 8. Admin lists product snapshots — must remain accessible after deletion
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
    "snapshots survive product deletion",
    snapshots.data.length > 0,
  );
  const snapshot = snapshots.data[0];
  // 9. Admin lists snapshot images within the snapshot
  const snapshotImagesPage =
    await api.functional.shoppingMall.admin.products.snapshots.images.index(
      adminConnection,
      {
        productId: product.id,
        snapshotId: snapshot.id,
        body: {} satisfies IShoppingMallProductSnapshotImage.IRequest,
      },
    );
  typia.assert(snapshotImagesPage);
  TestValidator.predicate(
    "snapshot images survive product deletion",
    snapshotImagesPage.data.length > 0,
  );
  const summaryImage = snapshotImagesPage.data[0];
  // 10. Admin retrieves the specific snapshot image by ID
  const snapshotImage =
    await api.functional.shoppingMall.admin.products.snapshots.images.at(
      adminConnection,
      {
        productId: product.id,
        snapshotId: snapshot.id,
        imageId: summaryImage.id,
      },
    );
  typia.assert(snapshotImage);
  // 11. Validate snapshot image is fully preserved as a durable audit record
  TestValidator.equals(
    "snapshot image ID matches",
    snapshotImage.id,
    summaryImage.id,
  );
  const preservedImageUrl: string = snapshotImage.imageUrl;
  TestValidator.equals(
    "snapshot image URL frozen and preserved",
    preservedImageUrl,
    summaryImage.image_url,
  );
  TestValidator.equals(
    "snapshot image display order preserved",
    snapshotImage.displayOrder,
    summaryImage.display_order,
  );
  TestValidator.equals(
    "snapshot image createdAt timestamp unchanged",
    snapshotImage.createdAt,
    summaryImage.created_at,
  );
  TestValidator.equals(
    "snapshot image belongs to correct parent snapshot",
    snapshotImage.shoppingMallProductSnapshotId,
    snapshot.id,
  );
}
