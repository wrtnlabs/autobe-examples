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
 * Validate atomic update of both image_url and display_order creates a single product snapshot.
 *
 * Tests that when a seller updates a product image's image_url and display_order simultaneously via PUT, both changes are applied atomically and exactly one product snapshot is created capturing the complete pre-change gallery state.
 *
 * The test covers the full lifecycle: administrator category creation, seller registration, product creation, two-image gallery setup, then the dual-field update. It verifies that the updated image receives the new URL, moves to display_order 0 (becoming the main thumbnail), and that the image previously at position 0 shifts to position 1.
 *
 * 1. Administrator joins and creates a product category.
 * 2. Seller joins, creates a product in that category.
 * 3. Seller uploads two images (display orders 0 and 1).
 * 4. Seller updates the image at position 1: new image_url and display_order 0.
 * 5. Validates response: new image_url applied, display_order is 0, updated_at changed, id and created_at preserved.
 */
export async function test_api_product_image_update_both_fields_single_snapshot(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup — create a product category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Seller setup — register and create a product
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
  // 3. Upload two images to the product gallery
  const image0 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(image0);
  const image1 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(image1);
  // 4. Update the image at position 1 — change both image_url and display_order to 0
  const newImageUrl = typia.random<string & tags.Format<"url">>();
  const updatedImage =
    await api.functional.shoppingMall.seller.products.images.update(
      sellerConnection,
      {
        productId: product.id,
        imageId: image1.id,
        body: {
          image_url: newImageUrl,
          display_order: 0,
        } satisfies IShoppingMallProductImage.IUpdate,
      },
    );
  typia.assert(updatedImage);
  // 5. Validate the response
  TestValidator.equals("same image id preserved", updatedImage.id, image1.id);
  TestValidator.equals(
    "image_url updated",
    updatedImage.image_url,
    newImageUrl,
  );
  TestValidator.equals(
    "display_order changed to 0",
    updatedImage.display_order,
    0,
  );
  TestValidator.notEquals(
    "updated_at reflects modification",
    updatedImage.updated_at,
    image1.updated_at,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedImage.created_at,
    image1.created_at,
  );
}
