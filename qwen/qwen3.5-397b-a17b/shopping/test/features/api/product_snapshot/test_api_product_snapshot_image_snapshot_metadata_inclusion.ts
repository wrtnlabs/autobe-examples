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

export async function test_api_product_snapshot_image_snapshot_metadata_inclusion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create product with specific fields for snapshot verification
  const productName = RandomGenerator.paragraph({ sentences: 1 });
  const productDescription = RandomGenerator.content({ paragraphs: 2 });
  const basePrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<100000>
  >();
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: productName,
        description: productDescription,
        shopping_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: basePrice,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Upload images to the product
  const imageCount = 3;
  const imageUrls = ArrayUtil.repeat(imageCount, (index) => ({
    image_url:
      `https://example.com/product-${product.id}-image-${index}.jpg` satisfies string &
        tags.Format<"uri">,
    display_order: index,
  }));
  const uploadedImages: IShoppingMallProductImage[] = [];
  for (const imageData of imageUrls) {
    const image =
      await generate_random_shopping_mall_seller_products_images_create(
        sellerConnection,
        {
          body: imageData,
          params: { productId: product.id },
        },
      );
    typia.assert(image);
    uploadedImages.push(image);
  }
  // 4. Edit product to trigger snapshot creation
  const updatedName = RandomGenerator.paragraph({ sentences: 1 });
  const updatedPrice = basePrice + 5000;
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: product.id,
      body: {
        name: updatedName,
        basePrice: updatedPrice,
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
    "at least one snapshot exists after product edit",
    snapshotsResponse.data.length > 0,
  );
  const snapshot = snapshotsResponse.data[0];
  const snapshotId = snapshot.id;
  // 6. Retrieve snapshot images list to get image ID
  const snapshotImagesResponse =
    await api.functional.shoppingMall.seller.products.snapshots.images.index(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: snapshotId,
        body: {
          page: 1,
          limit: 10,
          sort: "display_order,asc",
        } satisfies IShoppingMallProductSnapshotImage.IRequest,
      },
    );
  typia.assert(snapshotImagesResponse);
  TestValidator.predicate(
    "snapshot has at least one image",
    snapshotImagesResponse.data.length > 0,
  );
  const snapshotImageSummary = snapshotImagesResponse.data[0];
  const imageId = snapshotImageSummary.id;
  // 7. Test target endpoint: Get specific snapshot image with nested snapshot metadata
  const snapshotImageDetail =
    await api.functional.shoppingMall.seller.products.snapshots.images.at(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: snapshotId,
        imageId: imageId,
      },
    );
  typia.assert(snapshotImageDetail);
  // 8. Validate snapshot metadata inclusion
  TestValidator.predicate(
    "snapshot image includes nested snapshot object",
    snapshotImageDetail.snapshot !== undefined,
  );
  const nestedSnapshot = snapshotImageDetail.snapshot;
  // Validate snapshot structure
  TestValidator.equals("snapshot id matches", nestedSnapshot.id, snapshotId);
  // Validate snapshot contains product state at snapshot time
  TestValidator.predicate(
    "snapshot has product name",
    nestedSnapshot.name !== undefined && nestedSnapshot.name.length > 0,
  );
  TestValidator.predicate(
    "snapshot has base_price",
    typeof nestedSnapshot.base_price === "number" &&
      nestedSnapshot.base_price > 0,
  );
  TestValidator.predicate(
    "snapshot has snapshot_at timestamp",
    nestedSnapshot.snapshot_at !== undefined &&
      nestedSnapshot.snapshot_at.length > 0,
  );
  // Validate category structure in snapshot
  TestValidator.predicate(
    "snapshot includes category with id",
    nestedSnapshot.category !== undefined &&
      nestedSnapshot.category.id !== undefined,
  );
  TestValidator.predicate(
    "snapshot includes category with name",
    nestedSnapshot.category.name !== undefined &&
      nestedSnapshot.category.name.length > 0,
  );
  // Validate seller structure in snapshot
  TestValidator.predicate(
    "snapshot includes seller with shop_name",
    nestedSnapshot.seller !== undefined &&
      nestedSnapshot.seller.shop_name !== undefined &&
      nestedSnapshot.seller.shop_name.length > 0,
  );
  TestValidator.predicate(
    "snapshot includes seller approval_status",
    nestedSnapshot.seller.approval_status !== undefined &&
      ["PENDING", "APPROVED", "REJECTED"].includes(
        nestedSnapshot.seller.approval_status,
      ),
  );
  // Validate image metadata
  TestValidator.equals(
    "snapshot image id matches requested",
    snapshotImageDetail.id,
    imageId,
  );
  TestValidator.predicate(
    "snapshot image has valid image_url",
    snapshotImageDetail.image_url !== undefined &&
      snapshotImageDetail.image_url.length > 0,
  );
  TestValidator.predicate(
    "snapshot image has display_order",
    typeof snapshotImageDetail.display_order === "number" &&
      snapshotImageDetail.display_order >= 0,
  );
  TestValidator.predicate(
    "snapshot image has created_at timestamp",
    snapshotImageDetail.created_at !== undefined &&
      snapshotImageDetail.created_at.length > 0,
  );
  // Validate snapshot foreign key linkage
  TestValidator.equals(
    "snapshot image references correct snapshot",
    snapshotImageDetail.shopping_mall_product_snapshot_id,
    snapshotId,
  );
}
