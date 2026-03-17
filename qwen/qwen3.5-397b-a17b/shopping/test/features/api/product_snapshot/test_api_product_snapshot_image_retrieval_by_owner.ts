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

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_images_create } from "../../../generate/generate_random_shopping_mall_seller_products_images_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";

/**
 * Test that a seller can successfully retrieve a product snapshot image
 * from their own product's historical snapshot.
 *
 * This test verifies:
 * 1. Seller can access their own product's snapshot images
 * 2. Snapshot images preserve the original image data after product edits
 * 3. Response includes complete image record with snapshot metadata
 * 4. Snapshot contains accurate product state at time of capture
 */
export async function test_api_product_snapshot_image_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Upload multiple images to the product
  const imageUrls = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uri">>(),
  );
  const uploadedImages: IShoppingMallProductImage[] = [];
  for (let i = 0; i < imageUrls.length; i++) {
    const image =
      await generate_random_shopping_mall_seller_products_images_create(
        sellerConnection,
        {
          body: {
            image_url: imageUrls[i],
            display_order: i,
          } satisfies IShoppingMallProductImage.ICreate,
          params: {
            productId: product.id,
          },
        },
      );
    typia.assert(image);
    uploadedImages.push(image);
  }
  // 4. Edit the product to trigger snapshot creation
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: product.id,
      body: {
        name: `${product.name} - Updated`,
        basePrice: product.base_price + 1000,
      } satisfies IShoppingMallProduct.IUpdate,
    });
  typia.assert(updatedProduct);
  // 5. Retrieve product snapshots to get snapshot ID
  const snapshotsResponse =
    await api.functional.shoppingMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 10,
          sort: "snapshot_at,desc",
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  TestValidator.predicate(
    "at least one snapshot exists",
    () => snapshotsResponse.data.length > 0,
  );
  const snapshot = snapshotsResponse.data[0]!;
  // 6. Retrieve snapshot images list to get image ID
  const snapshotImagesResponse =
    await api.functional.shoppingMall.seller.products.snapshots.images.index(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: snapshot.id,
        body: {
          page: 1,
          limit: 10,
          sort: "display_order,asc",
        } satisfies IShoppingMallProductSnapshotImage.IRequest,
      },
    );
  typia.assert(snapshotImagesResponse);
  TestValidator.predicate(
    "snapshot has images",
    () => snapshotImagesResponse.data.length > 0,
  );
  const snapshotImageSummary = snapshotImagesResponse.data[0]!;
  // 7. Retrieve specific snapshot image
  const snapshotImage =
    await api.functional.shoppingMall.seller.products.snapshots.images.at(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: snapshot.id,
        imageId: snapshotImageSummary.id,
      },
    );
  typia.assert(snapshotImage);
  // 8. Validate response structure and data integrity
  TestValidator.equals(
    "snapshot ID matches",
    snapshotImage.shopping_mall_product_snapshot_id,
    snapshot.id,
  );
  TestValidator.equals(
    "image URL preserved from upload",
    snapshotImage.image_url,
    uploadedImages[0]!.image_url,
  );
  TestValidator.predicate(
    "display order is non-negative",
    () => snapshotImage.display_order >= 0,
  );
  TestValidator.equals(
    "snapshot product name matches",
    snapshotImage.snapshot.name,
    product.name,
  );
  TestValidator.equals(
    "snapshot seller matches authenticated seller",
    snapshotImage.snapshot.seller.id,
    sellerAuth.id,
  );
  TestValidator.predicate(
    "snapshot has valid timestamp",
    () =>
      new Date(snapshotImage.snapshot.snapshot_at).getTime() >
      new Date(product.created_at).getTime(),
  );
}
