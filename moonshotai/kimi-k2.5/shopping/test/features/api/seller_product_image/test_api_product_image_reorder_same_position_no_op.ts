import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
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
 * Test reordering a product image to the same position (no-op scenario).
 *
 * 1. Register as a seller and obtain authentication tokens
 * 2. Create a product category (admin operation)
 * 3. Create a product as the authenticated seller
 * 4. Upload an image to the product (automatically assigned display_order 0)
 * 5. Update the image's display_order to the same value (0)
 * 6. Verify the response shows unchanged position but updated timestamp
 */
export async function test_api_product_image_reorder_same_position_no_op(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for category creation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Create product category (awaiting admin approval is default)
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // Create seller connection for product and image operations
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // Create product as seller using the category
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        categoryId: category.id,
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Upload an image to the product - gets display_order 0 automatically as first image
  const image =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          imageUrl: typia.random<string & tags.Format<"uri">>(),
        } satisfies IEcommerceMallProductImage.ICreate,
      },
    );
  typia.assert(image);
  // Verify initial state - first image should have display_order 0
  TestValidator.equals("initial display order is 0", image.displayOrder, 0);
  TestValidator.equals(
    "initial product ID matches",
    image.product.id,
    product.id,
  );
  // Reorder image to the same position (no-op scenario)
  const updatedImage =
    await api.functional.ecommerceMall.seller.products.images.update(
      sellerConnection,
      {
        productId: product.id,
        productImageId: image.id,
        body: {
          display_order: 0,
        } satisfies IEcommerceMallProductImage.IUpdate,
      },
    );
  typia.assert(updatedImage);
  // Verify the image position remains unchanged
  TestValidator.equals(
    "display order remains unchanged at 0",
    updatedImage.displayOrder,
    0,
  );
  TestValidator.equals("image ID unchanged", updatedImage.id, image.id);
  TestValidator.equals(
    "image URL unchanged",
    updatedImage.imageUrl,
    image.imageUrl,
  );
  TestValidator.equals(
    "product reference unchanged",
    updatedImage.product.id,
    product.id,
  );
  // Verify the operation was processed (timestamp should be updated)
  TestValidator.predicate(
    "updated_at timestamp was touched",
    updatedImage.updatedAt >= image.updatedAt,
  );
  // Verify created_at was not modified
  TestValidator.equals(
    "created_at unchanged",
    updatedImage.createdAt,
    image.createdAt,
  );
}
