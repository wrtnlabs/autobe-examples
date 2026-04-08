import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
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
import { generate_random_ecommerce_mall_admin_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_admin_categories_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_images_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_images_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";

/**
 * Test attempting to reorder product images with an image ID that does not belong to the specified product.
 *
 * Validates the image reordering endpoint's validation logic that ensures all image IDs in the reorder request
 * belong to the specified product. This test creates two products with images, then attempts to reorder
 * one product's images using an image ID from the other product. The system should reject this request
 * with HTTP 400 Bad Request.
 *
 * **Business Rule**: When reordering product images, all image IDs must belong to the product being reordered.
 * Attempting to use an image ID from another product indicates a data integrity or manipulation issue
 * that should be rejected by the server.
 *
 * 1. Administrator creates a product category for classification.
 * 2. Seller registers and authenticates on the platform.
 * 3. Seller creates first product and uploads multiple images.
 * 4. Seller creates second product and uploads images.
 * 5. Seller attempts to reorder first product's images including an image from the second product.
 * 6. System rejects the invalid request with HTTP 400 status code.
 */
export async function test_api_product_image_reorder_with_invalid_image_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin to create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create product category
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 3. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 4. Create first product
  const product1 =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {
        body: {
          categoryId: category.id,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          basePrice: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        },
      },
    );
  typia.assert(product1);
  // 5. Upload multiple images to first product
  const image1 =
    await generate_random_ecommerce_mall_seller_sellers_me_products_images_create(
      sellerConnection,
      {
        params: { productId: product1.id },
      },
    );
  typia.assert(image1);
  const image2 =
    await generate_random_ecommerce_mall_seller_sellers_me_products_images_create(
      sellerConnection,
      {
        params: { productId: product1.id },
      },
    );
  typia.assert(image2);
  // 6. Create second product
  const product2 =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {
        body: {
          categoryId: category.id,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          basePrice: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        },
      },
    );
  typia.assert(product2);
  // 7. Upload image to second product (this image ID belongs to product2)
  const foreignImage =
    await generate_random_ecommerce_mall_seller_sellers_me_products_images_create(
      sellerConnection,
      {
        params: { productId: product2.id },
      },
    );
  typia.assert(foreignImage);
  // 8. Attempt to reorder first product's images with invalid foreign image ID
  // This should fail because foreignImage.id belongs to product2, not product1
  await TestValidator.error("reorder with foreign image ID", async () => {
    await api.functional.ecommerceMall.seller.sellers.me.products.images.update(
      sellerConnection,
      {
        productId: product1.id,
        body: {
          imageIds: [foreignImage.id, image1.id, image2.id],
        } satisfies IEcommerceMallProductImage.IReorderRequest,
      },
    );
  });
}
