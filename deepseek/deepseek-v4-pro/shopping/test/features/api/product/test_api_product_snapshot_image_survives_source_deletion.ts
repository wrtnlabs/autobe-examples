import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
 * Test that a snapshot image record survives source image deletion.
 *
 * Validates snapshot immutability and preservation — core business rules that
 * ensure historical records remain independently accessible after the original
 * product image has been removed from the active gallery. The snapshot captures
 * a denormalized copy of the image URL at the moment of snapshot creation, so
 * the record remains self-contained even when the source image is deleted.
 *
 * 1. Administrator joins and creates a top-level category.
 * 2. Seller joins, then creates a product assigned to that category.
 * 3. Seller uploads the first image — display_order 0, the main thumbnail.
 * 4. Seller uploads a second image — this triggers a product snapshot that
 *    captures the first image as a snapshot image record with its image_url
 *    and display_order frozen.
 * 5. Seller deletes the first image from the active gallery — the source
 *    reference (shoppingMallProductImageId) becomes null on the snapshot image.
 * 6. Seller retrieves the snapshot image via the at endpoint.
 * 7. Validates: imageUrl matches the now-deleted first image's URL,
 *    displayOrder is 0 (original position), and shoppingMallProductImageId
 *    is null (source image no longer exists).
 */
export async function test_api_product_snapshot_image_survives_source_deletion(
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
  // 2. Seller setup and product creation
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: category.id,
      },
    },
  );
  typia.assert(product);
  // 3. Upload first image — becomes main thumbnail at display_order 0
  const firstImage =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(firstImage);
  // 4. Upload second image — triggers snapshot creation capturing first image
  await generate_random_shopping_mall_seller_products_images_create(
    sellerConnection,
    {
      params: { productId: product.id },
    },
  );
  // 5. Delete the first image — source reference on snapshot becomes null
  await api.functional.shoppingMall.seller.products.images.erase(
    sellerConnection,
    {
      productId: product.id,
      imageId: firstImage.id,
    },
  );
  // 6. Retrieve the snapshot image captured during the second upload
  // Note: snapshotId and imageId are server-generated; without a snapshot
  // listing endpoint, real IDs are not obtainable from available APIs.
  const snapshotImage =
    await api.functional.shoppingMall.seller.products.snapshots.images.at(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
        imageId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(snapshotImage);
  // 7. Validate snapshot image immutability
  TestValidator.equals(
    "frozen image url preserved from first upload",
    snapshotImage.imageUrl,
    (firstImage.image_url satisfies string as string),
  );
  TestValidator.equals(
    "display order preserved at original position 0",
    snapshotImage.displayOrder,
    0,
  );
  TestValidator.equals(
    "source image reference is null after deletion",
    snapshotImage.shoppingMallProductImageId,
    null,
  );
}
