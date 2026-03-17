import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
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
import { generate_random_ecommerce_mall_seller_registrations_create } from "../../../generate/generate_random_ecommerce_mall_seller_registrations_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_seller_registration } from "../../../prepare/prepare_random_ecommerce_mall_seller_registration";

export async function test_api_product_image_last_image_deletion(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test deleting the last remaining image from a product.
   *
   * Scenario:
   * 1. Create admin account for category management
   * 2. Create seller account and submit registration
   * 3. Create a product category (admin only)
   * 4. Create a product with no images initially
   * 5. Upload a single image to the product
   * 6. Delete the image (the only/last one)
   * 7. Verify deletion succeeds without errors
   *
   * Expected: The image is soft-deleted and the product displays without a thumbnail.
   */
  // Setup admin connection for category creation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // Setup seller connection
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // Submit seller registration application
  await generate_random_ecommerce_mall_seller_registrations_create(
    sellerConnection,
    {
      body: {
        taxIdentificationNumber: RandomGenerator.alphaNumeric(10),
        businessRegistrationNumber: RandomGenerator.alphaNumeric(10),
        businessName: RandomGenerator.name(),
        businessAddress: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IEcommerceMallSellerRegistration.ICreate,
    },
  );
  // Create category as admin (required for product creation)
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        parentId: null,
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // Create product as seller (initially without images)
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        categoryId: category.id,
        basePrice: typia.random<number & tags.Type<"uint32">>(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Upload a single image to the product
  const image =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          imageUrl: typia.random<string & tags.Format<"uri">>(),
        } satisfies IEcommerceMallProductImage.ICreate,
      },
    );
  typia.assert(image);
  // Delete the last/only image - this should succeed and leave product without images
  await api.functional.ecommerceMall.seller.products.images.erase(
    sellerConnection,
    {
      productId: product.id,
      imageId: image.id,
    },
  );
  // The deletion should complete without throwing an error
  // Note: Verification that the product now has no images would require
  // fetching the product via GET endpoint, which is not available in the
  // provided API functions. The successful deletion without error validates
  // that sellers can delete the last remaining image from their products.
}
