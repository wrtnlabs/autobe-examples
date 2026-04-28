import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductImage";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
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
import { generate_random_ecommerce_platform_admin_categories_create } from "../../../generate/generate_random_ecommerce_platform_admin_categories_create";
import { generate_random_ecommerce_platform_seller_products_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_create";
import { generate_random_ecommerce_platform_seller_products_images_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_images_create";
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";
import { prepare_random_ecommerce_platform_product_image } from "../../../prepare/prepare_random_ecommerce_platform_product_image";

/**
 * Test retrieving a specific product image by its unique identifier.
 *
 * Validates the complete product image retrieval flow including administrative category setup, seller product creation, image attachment, and public image retrieval. Ensures that the retrieved image contains all expected fields with correct values matching the creation data.
 *
 * The test verifies that the public GET endpoint for product images correctly returns the full image entity including display order position and lifecycle timestamps. Active images should have a null deleted_at value.
 *
 * 1. Administrator registers and creates a product category.
 * 2. Seller registers and creates a product assigned to the category.
 * 3. Seller adds multiple images to the product.
 * 4. Retrieve one specific image using productId and imageId.
 * 5. Validate the retrieved image matches the created image data.
 */
export async function test_api_product_image_retrieval_by_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registers and creates category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller registers and creates product
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {
        body: { category_id: category.id },
      },
    );
  typia.assert(product);
  // 3. Seller adds multiple images to the product
  const image1 =
    await generate_random_ecommerce_platform_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          uri: `https://images.example.com/product/${product.id}/image1.jpg`,
        },
      },
    );
  typia.assert(image1);
  const image2 =
    await generate_random_ecommerce_platform_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          uri: `https://images.example.com/product/${product.id}/image2.jpg`,
        },
      },
    );
  typia.assert(image2);
  const image3 =
    await generate_random_ecommerce_platform_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          uri: `https://images.example.com/product/${product.id}/image3.jpg`,
        },
      },
    );
  typia.assert(image3);
  // 4. Retrieve specific image using public endpoint
  const retrievedImage: IEcommercePlatformProductImage =
    await api.functional.ecommercePlatform.products.images.at(connection, {
      productId: product.id,
      imageId: image2.id,
    });
  typia.assert(retrievedImage);
  // 5. Validate retrieved image matches created image
  TestValidator.equals("image id matches", retrievedImage.id, image2.id);
  TestValidator.equals(
    "image uri matches",
    retrievedImage.uri,
    `https://images.example.com/product/${product.id}/image2.jpg`,
  );
  TestValidator.predicate(
    "image has valid order index",
    retrievedImage.order_index > 0,
  );
  TestValidator.equals(
    "deleted_at is null for active image",
    retrievedImage.deleted_at,
    null,
  );
}
