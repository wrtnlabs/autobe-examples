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
 * Test that a seller can replace a product image file by updating its image_url
 * while preserving its display_order position in the gallery and its identity
 * within existing snapshots.
 *
 * Validates the image URL replacement endpoint for product gallery images owned
 * by the authenticated seller. The key behavioral guarantees tested are:
 * the image_url is updated to the new value, the display_order remains unchanged
 * at its original position (0), the image identity (id) is preserved, and the
 * updated_at timestamp reflects the modification.
 *
 * A product snapshot capturing the pre-change gallery state is created by the
 * server before the image URL replacement is applied. This ensures historical
 * records remain intact and the replacement does not orphan or invalidate
 * existing snapshot records.
 *
 * 1. Administrator registers and creates a product category for the seller.
 * 2. Seller registers, creates a product, and uploads a single image.
 * 3. Seller replaces the image URL while omitting display_order from the body.
 * 4. Validates image_url updated, display_order preserved at 0, and identity
 *    retained with updated timestamp differing from the original.
 */
export async function test_api_product_image_replace_file_preserve_position(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup — register and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a product category for seller's product
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  // 3. Seller setup — register and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 4. Create a product owned by the seller
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: category.id,
      },
    },
  );
  // 5. Upload a single image to the product gallery (auto-assigned display_order 0)
  const originalImage =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(originalImage);
  // 6. Replace the image file — provide only image_url, omit display_order
  const newImageUrl = typia.random<string & tags.Format<"url">>();
  const updatedImage =
    await api.functional.shoppingMall.seller.products.images.update(
      sellerConnection,
      {
        productId: product.id,
        imageId: originalImage.id,
        body: {
          image_url: newImageUrl,
        } satisfies IShoppingMallProductImage.IUpdate,
      },
    );
  typia.assert(updatedImage);
  // 7. Validate: image_url changed, display_order preserved, identity retained
  TestValidator.equals(
    "display_order preserved at 0",
    updatedImage.display_order,
    0,
  );
  TestValidator.equals(
    "image_url updated to new value",
    updatedImage.image_url,
    newImageUrl,
  );
  TestValidator.notEquals(
    "image_url differs from original",
    updatedImage.image_url,
    originalImage.image_url,
  );
  TestValidator.equals(
    "image identity preserved",
    updatedImage.id,
    originalImage.id,
  );
  TestValidator.equals(
    "product reference preserved",
    updatedImage.product.id,
    product.id,
  );
  TestValidator.predicate(
    "updated_at reflects modification",
    updatedImage.updated_at !== originalImage.updated_at,
  );
}
