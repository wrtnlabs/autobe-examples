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

export async function test_api_product_snapshot_image_display_order_preservation(
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
    },
  });
  typia.assert(sellerAuth);
  // 2. Create a product
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
  // 3. Upload 3 images with explicit display orders (0, 1, 2)
  const imageUrls = [
    typia.random<string & tags.Format<"uri">>(),
    typia.random<string & tags.Format<"uri">>(),
    typia.random<string & tags.Format<"uri">>(),
  ];
  const image1 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          image_url: imageUrls[0],
          display_order: 0,
        },
      },
    );
  typia.assert(image1);
  const image2 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          image_url: imageUrls[1],
          display_order: 1,
        },
      },
    );
  typia.assert(image2);
  const image3 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          image_url: imageUrls[2],
          display_order: 2,
        },
      },
    );
  typia.assert(image3);
  // 4. Reorder images: move image2 to position 0, image1 to position 1, image3 stays at 2
  // New order: [image2, image1, image3]
  await api.functional.shoppingMall.seller.products.images.reorder(
    sellerConnection,
    {
      productId: product.id,
    },
  );
  // 5. Edit product to trigger snapshot creation
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: product.id,
      body: {
        name: `${product.name} - Updated`,
      },
    });
  typia.assert(updatedProduct);
  // 6. Retrieve product snapshots to get the snapshot ID
  const snapshots =
    await api.functional.shoppingMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 10,
          sort: "snapshot_at,desc",
        },
      },
    );
  typia.assert(snapshots);
  TestValidator.predicate(
    "at least one snapshot exists",
    () => snapshots.data.length > 0,
  );
  const latestSnapshot = snapshots.data[0];
  const snapshotId = latestSnapshot.id;
  // 7. Retrieve snapshot images list
  const snapshotImagesPage =
    await api.functional.shoppingMall.seller.products.snapshots.images.index(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: snapshotId,
        body: {
          page: 1,
          limit: 10,
          sort: "display_order,asc",
        },
      },
    );
  typia.assert(snapshotImagesPage);
  TestValidator.predicate(
    "snapshot has images",
    () => snapshotImagesPage.data.length > 0,
  );
  const snapshotImages = snapshotImagesPage.data;
  // 8. Fetch each snapshot image individually and validate display order preservation
  const fetchedImages: IShoppingMallProductSnapshotImage[] = [];
  for (const snapshotImage of snapshotImages) {
    const fetchedImage =
      await api.functional.shoppingMall.seller.products.snapshots.images.at(
        sellerConnection,
        {
          productId: product.id,
          snapshotId: snapshotId,
          imageId: snapshotImage.id,
        },
      );
    typia.assert(fetchedImage);
    fetchedImages.push(fetchedImage);
  }
  // Validate that display orders are preserved in the snapshot
  TestValidator.equals(
    "snapshot image count matches",
    fetchedImages.length,
    snapshotImages.length,
  );
  // Verify display_order values are sequential starting from 0
  const sortedByDisplayOrder = fetchedImages.sort(
    (a, b) => a.display_order - b.display_order,
  );
  for (let i = 0; i < sortedByDisplayOrder.length; i++) {
    TestValidator.equals(
      `image ${i} display_order is ${i}`,
      sortedByDisplayOrder[i].display_order,
      i,
    );
  }
  // Verify snapshot image URLs match the original uploaded images (reordered)
  const snapshotImageUrls = sortedByDisplayOrder.map((img) => img.image_url);
  // After reordering [image2, image1, image3], the URLs should match that order
  TestValidator.equals(
    "first snapshot image is reordered image2",
    snapshotImageUrls[0],
    image2.image_url,
  );
  TestValidator.equals(
    "second snapshot image is reordered image1",
    snapshotImageUrls[1],
    image1.image_url,
  );
  TestValidator.equals(
    "third snapshot image is image3 (unchanged)",
    snapshotImageUrls[2],
    image3.image_url,
  );
  // Verify snapshot preserves the reordered state immutably
  // Even if we reorder current product images again, snapshot should remain unchanged
  await api.functional.shoppingMall.seller.products.images.reorder(
    sellerConnection,
    {
      productId: product.id,
    },
  );
  // Fetch the same snapshot images again - they should be unchanged
  const refetchedImage =
    await api.functional.shoppingMall.seller.products.snapshots.images.at(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: snapshotId,
        imageId: sortedByDisplayOrder[0].id,
      },
    );
  typia.assert(refetchedImage);
  TestValidator.equals(
    "snapshot image display_order immutable after re-reorder",
    refetchedImage.display_order,
    sortedByDisplayOrder[0].display_order,
  );
  TestValidator.equals(
    "snapshot image URL immutable after re-reorder",
    refetchedImage.image_url,
    sortedByDisplayOrder[0].image_url,
  );
}
