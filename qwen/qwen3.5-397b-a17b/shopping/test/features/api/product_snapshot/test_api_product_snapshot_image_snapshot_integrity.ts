import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IPageIShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshotImage";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistic";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
 * Test product snapshot image integrity and immutability.
 *
 * This test verifies that product snapshot images preserve the exact state
 * of the product image at the time of snapshot creation, even if the original
 * product image is deleted afterward. The workflow:
 * 1. Admin and seller authentication
 * 2. Seller creates a product
 * 3. Seller uploads an image to the product
 * 4. Seller edits product to create snapshot
 * 5. Admin retrieves snapshot images and records image_url
 * 6. Seller deletes the original product image
 * 7. Admin retrieves the same snapshot image again
 * 8. Verify snapshot image still contains original image_url (immutability)
 */
export async function test_api_product_snapshot_image_snapshot_integrity(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(sellerAuth);
  // 3. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 4. Seller uploads an image to the product
  const originalImageUrl = typia.random<string & tags.Format<"uri">>();
  const productImage =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          image_url: originalImageUrl,
          display_order: 0,
        },
      },
    );
  typia.assert(productImage);
  // 5. Seller edits product to create snapshot (with image preserved)
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: product.id,
      body: {
        name: `${product.name} - Updated`,
      } satisfies IShoppingMallProduct.IUpdate,
    });
  typia.assert(updatedProduct);
  // 6. Admin retrieves snapshots to get snapshotId
  const snapshots =
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
  typia.assert(snapshots);
  TestValidator.predicate(
    "at least one snapshot exists",
    snapshots.data.length > 0,
  );
  const latestSnapshot = snapshots.data[0];
  const snapshotId = latestSnapshot.id;
  // 7. Admin retrieves snapshot images list to get imageId
  const snapshotImages =
    await api.functional.shoppingMall.admin.products.snapshots.images.index(
      adminConnection,
      {
        productId: product.id,
        snapshotId: snapshotId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductSnapshotImage.IRequest,
      },
    );
  typia.assert(snapshotImages);
  TestValidator.predicate(
    "snapshot has at least one image",
    snapshotImages.data.length > 0,
  );
  const snapshotImage = snapshotImages.data[0];
  const snapshotImageId = snapshotImage.id;
  const snapshotImageUrl = snapshotImage.image_url;
  // 8. Record the snapshot image's image_url before deletion
  const originalSnapshotImageUrl = snapshotImageUrl;
  // 9. Seller deletes the original product image after snapshot creation
  await api.functional.shoppingMall.seller.products.images.erase(
    sellerConnection,
    {
      productId: product.id,
      imageId: productImage.id,
    },
  );
  // 10. Admin retrieves the same snapshot image again
  const retrievedSnapshotImage =
    await api.functional.shoppingMall.admin.products.snapshots.images.at(
      adminConnection,
      {
        productId: product.id,
        snapshotId: snapshotId,
        imageId: snapshotImageId,
      },
    );
  typia.assert(retrievedSnapshotImage);
  // 11. Verify snapshot image still contains original image_url (immutability)
  TestValidator.equals(
    "snapshot image_url unchanged after original deletion",
    retrievedSnapshotImage.image_url,
    originalSnapshotImageUrl,
  );
  // Additional verification: snapshot image matches what we recorded
  TestValidator.equals(
    "snapshot preserves original image state",
    retrievedSnapshotImage.image_url,
    originalImageUrl,
  );
}
