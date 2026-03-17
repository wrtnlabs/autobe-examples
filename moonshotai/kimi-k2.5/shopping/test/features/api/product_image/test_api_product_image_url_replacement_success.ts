import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
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
 * Test image URL replacement while maintaining display order.
 *
 * 1. Admin joins and creates a category
 * 2. Seller joins and creates a product in that category
 * 3. Seller uploads an initial image to the product
 * 4. Seller updates the image with a new URL while keeping the same displayOrder
 * 5. Validate that the update succeeds with the new URL and unchanged displayOrder
 */
export async function test_api_product_image_url_replacement_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    { body: undefined },
  );
  typia.assert(category);
  // 2. Seller setup - create product
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
      },
    },
  );
  typia.assert(product);
  // 3. Upload initial image
  const initialImage =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: undefined,
      },
    );
  typia.assert(initialImage);
  // Store original values for comparison
  const originalDisplayOrder = initialImage.displayOrder;
  const originalImageUrl = initialImage.imageUrl;
  // 4. Update the image with a new URL while keeping the same displayOrder
  const newImageUrl = typia.random<string & tags.Format<"url">>();
  const updatedImage =
    await api.functional.ecommerceMall.seller.products.images.update(
      sellerConnection,
      {
        productId: product.id,
        imageId: initialImage.id,
        body: {
          imageUrl: newImageUrl,
          displayOrder: originalDisplayOrder satisfies number as number & tags.Type<"int32"> & tags.Minimum<0>,
        } satisfies IEcommerceMallProductImage.IUpdate,
      },
    );
  typia.assert(updatedImage);
  // 5. Validate the update succeeded with correct values
  TestValidator.equals(
    "image ID should remain unchanged",
    updatedImage.id,
    initialImage.id,
  );
  TestValidator.equals(
    "image URL should be updated to new value",
    updatedImage.imageUrl,
    newImageUrl,
  );
  TestValidator.notEquals(
    "new image URL should differ from original",
    updatedImage.imageUrl,
    originalImageUrl,
  );
  TestValidator.equals(
    "displayOrder should remain unchanged",
    updatedImage.displayOrder,
    originalDisplayOrder,
  );
  TestValidator.equals(
    "product ID should remain unchanged",
    updatedImage.product.id,
    product.id,
  );
}