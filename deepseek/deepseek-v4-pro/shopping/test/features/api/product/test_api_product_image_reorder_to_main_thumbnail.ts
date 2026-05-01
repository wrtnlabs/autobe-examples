import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
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
 * Test product image reorder to main thumbnail position.
 *
 * Validates that a seller can reorder an image within their product's gallery
 * by moving the image at display_order position 2 to position 0, promoting it
 * to the main thumbnail and causing intermediate images to shift forward.
 *
 * The test first establishes the necessary resources: an administrator creates
 * a product category, a seller registers and creates a product, then the seller
 * uploads three images which receive sequential display_order values (0, 1, 2).
 * After confirming the initial ordering, the test reorders the third image to
 * position 0 and validates that the response reflects the reorder — the image
 * ID and URL are preserved, the display_order becomes 0, and the updated_at
 * timestamp changes to reflect the modification.
 *
 * 1. Administrator joins and creates a top-level product category.
 * 2. Seller joins and creates a product under the category.
 * 3. Seller uploads three images to the product gallery.
 * 4. Initial display_order values are verified as 0, 1, 2.
 * 5. The image at position 2 is updated to position 0 via PUT.
 * 6. Response is validated: id unchanged, display_order is 0, url preserved,
 *    updated_at reflects the modification.
 */
export async function test_api_product_image_reorder_to_main_thumbnail(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    { body: {} },
  );
  typia.assert(category);
  // 2. Seller setup - register and create product
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: { shopping_mall_category_id: category.id } },
  );
  typia.assert(product);
  // 3. Upload 3 images to the product gallery
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
  // 4. Validate initial sequential display order
  TestValidator.equals("image1 initial position", image1.display_order, 0);
  TestValidator.equals("image2 initial position", image2.display_order, 1);
  TestValidator.equals("image3 initial position", image3.display_order, 2);
  // 5. Reorder image3 from position 2 to position 0 (main thumbnail)
  const updated =
    await api.functional.shoppingMall.seller.products.images.update(
      sellerConnection,
      {
        productId: product.id,
        imageId: image3.id,
        body: {
          display_order: 0,
        } satisfies IShoppingMallProductImage.IUpdate,
      },
    );
  typia.assert(updated);
  // 6. Validate the response
  TestValidator.equals("image id preserved", updated.id, image3.id);
  TestValidator.equals(
    "image assigned to same product",
    updated.product.id,
    product.id,
  );
  TestValidator.equals(
    "image_url preserved",
    updated.image_url,
    image3.image_url,
  );
  TestValidator.equals("display_order moved to 0", updated.display_order, 0);
  TestValidator.notEquals(
    "updated_at reflects modification",
    updated.updated_at,
    image3.updated_at,
  );
}
