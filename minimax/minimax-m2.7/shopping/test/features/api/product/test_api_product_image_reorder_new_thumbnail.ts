import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_images_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_images_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";

/**
 * Test that after reordering product images, the image now at display_order=0 becomes the new main thumbnail.
 *
 * Steps:
 * 1. Authenticate as seller and admin
 * 2. Admin creates category
 * 3. Seller creates product
 * 4. Upload 2 images
 * 5. Reorder images (swap positions)
 * 6. Verify the image previously at position 1 is now at position 0 (new thumbnail)
 */
export async function test_api_product_image_reorder_new_thumbnail(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 2. Admin creates category
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 3. Authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 4. Seller creates product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
      },
    },
  );
  typia.assert(product);
  // 5. Upload first image (will be initial thumbnail at display_order=0)
  const firstImage =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          imageUrl: typia.random<string & tags.Format<"uri">>(),
          displayOrder: 0,
        },
      },
    );
  typia.assert(firstImage);
  // 6. Upload second image (will be moved to position 0 during reorder)
  const secondImage =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          imageUrl: typia.random<string & tags.Format<"uri">>(),
          displayOrder: 1,
        },
      },
    );
  typia.assert(secondImage);
  // 7. Verify initial state
  TestValidator.equals("first image at position 0", firstImage.displayOrder, 0);
  TestValidator.equals(
    "second image at position 1",
    secondImage.displayOrder,
    1,
  );
  // 8. Reorder: swap positions - second image moves to 0, first image moves to 1
  const reorderResponse =
    await api.functional.ecommerceMall.seller.products.images.reorder(
      sellerConnection,
      {
        productId: product.id,
        body: {
          items: [
            {
              imageId: secondImage.id,
              displayOrder: 0,
            } satisfies IEcommerceMallProductImage.IReorderItem,
            {
              imageId: firstImage.id,
              displayOrder: 1,
            } satisfies IEcommerceMallProductImage.IReorderItem,
          ],
        } satisfies IEcommerceMallProductImage.IReorder,
      },
    );
  typia.assert(reorderResponse);
  // 9. Verify reorder response
  TestValidator.equals(
    "response contains 2 images",
    reorderResponse.images.length,
    2,
  );
  // 10. Find the image that is now at position 0 (new main thumbnail)
  const newThumbnailImage = reorderResponse.images.find(
    (img) => img.displayOrder === 0,
  )!;
  const oldThumbnailImage = reorderResponse.images.find(
    (img) => img.displayOrder === 1,
  )!;
  // 11. Verify the new thumbnail is the image that was previously at position 1
  TestValidator.equals(
    "new thumbnail is second image (was at position 1)",
    newThumbnailImage.id,
    secondImage.id,
  );
  TestValidator.equals(
    "old thumbnail is first image (was at position 0)",
    oldThumbnailImage.id,
    firstImage.id,
  );
  // 12. Verify display orders are correct
  TestValidator.equals(
    "new thumbnail display_order is 0",
    newThumbnailImage.displayOrder,
    0,
  );
  TestValidator.equals(
    "old thumbnail display_order is 1",
    oldThumbnailImage.displayOrder,
    1,
  );
  // 13. Verify images are sorted correctly by displayOrder
  TestValidator.predicate(
    "images are ordered by displayOrder",
    reorderResponse.images[0].displayOrder <
      reorderResponse.images[1].displayOrder,
  );
}
