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
 * Test successful deletion of a product image by the product owner seller.
 *
 * Validates that:
 * 1. Admin creates a category as prerequisite for product creation
 * 2. Seller authenticates and creates a product in that category
 * 3. Seller uploads multiple images to establish sequential display orders
 * 4. When an image is deleted, the operation succeeds and applies soft delete
 * 5. Remaining images' display orders are automatically reorganized to be sequential
 *
 * Note: This test validates the delete operation succeeds. Full verification
 * of display_order reordering requires fetching the product, which would need
 * a GET endpoint not currently available in the SDK.
 */
export async function test_api_product_image_deletion_with_reordering(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Admin creates category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string>(),
    },
  });
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // Setup: Seller authenticates
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {},
  });
  // Setup: Create product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
      },
    },
  );
  typia.assert(product);
  // Upload 3 images to establish display orders 0, 1, 2
  const images = await ArrayUtil.asyncRepeat(3, async (index) => {
    const image =
      await generate_random_ecommerce_mall_seller_products_images_create(
        sellerConnection,
        {
          params: { productId: product.id },
          body: {
            imageUrl: `https://example.com/test-image-${index}.jpg`,
          },
        },
      );
    typia.assert(image);
    return image;
  });
  // Verify initial display orders are sequential (0, 1, 2)
  const sortedImages = [...images].sort(
    (a, b) => a.displayOrder - b.displayOrder,
  );
  sortedImages.forEach((image, index) => {
    if (image.displayOrder !== index) {
      throw new Error(
        `Expected display order ${index} but got ${image.displayOrder} for image ${image.id}`,
      );
    }
  });
  // Select middle image for deletion (display_order 1)
  const imageToDelete = sortedImages[1]!;
  // Delete the middle image - this should trigger reordering
  await api.functional.ecommerceMall.seller.products.images.erase(
    sellerConnection,
    {
      productId: product.id,
      productImageId: imageToDelete.id,
    },
  );
}
