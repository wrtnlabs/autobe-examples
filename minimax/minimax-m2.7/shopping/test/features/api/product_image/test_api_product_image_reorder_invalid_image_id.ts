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
 * Test that the system returns 404 when attempting to reorder product images with an invalid image ID.
 *
 * Validates that the reorder endpoint properly validates image ownership and existence before processing reorder requests. When an imageId is provided that does not exist or does not belong to the specified product, the API must return 404 Not Found error.
 *
 * **Setup Flow**:
 * 1. Admin creates a category for product assignment
 * 2. Seller registers and authenticates via join
 * 3. Seller creates a product with the category
 * 4. Seller uploads images to the product
 *
 * **Test Execution**:
 * 5. Generate a non-existent image ID (random UUID that doesn't exist in the system)
 * 6. Seller attempts to reorder images with the invalid image ID
 *
 * **Validation Points**:
 * - Response: 404 Not Found HTTP error
 * - Error message indicates the image was not found or does not belong to the product
 *
 * This test ensures proper input validation on the reorder endpoint and prevents unauthorized image manipulation.
 */
export async function test_api_product_image_reorder_invalid_image_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates a category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller registers and authenticates
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Seller creates a product with the category
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {
        body: {
          categoryId: category.id,
        },
      },
    );
  typia.assert(product);
  // 4. Seller uploads images to the product
  const image1 =
    await generate_random_ecommerce_mall_seller_sellers_me_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(image1);
  const image2 =
    await generate_random_ecommerce_mall_seller_sellers_me_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(image2);
  // 5. Generate a non-existent image ID
  const invalidImageId = typia.random<string & tags.Format<"uuid">>();
  // 6. Seller attempts to reorder with invalid image ID
  await TestValidator.httpError(
    "reorder with invalid image ID should return 404",
    404,
    async () => {
      await api.functional.ecommerceMall.seller.sellers.me.products.images.reorder(
        sellerConnection,
        {
          productId: product.id,
          body: {
            reorderItems: [
              {
                imageId: invalidImageId,
                newDisplayOrder: 1,
              },
            ],
          },
        },
      );
    },
  );
}
