import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { generate_random_ecommerce_seller_products_images_create } from "../../../generate/generate_random_ecommerce_seller_products_images_create";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_image } from "../../../prepare/prepare_random_ecommerce_product_image";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";

export async function test_api_product_image_update_display_order_conflict(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test product image display order update conflict validation.
   *
   * Validates that updating a product image's display order to a value already occupied by another image within the same product is rejected with a conflict error. This ensures the uniqueness constraint on (productId, displayOrder) is properly enforced at the business logic level.
   *
   * The test follows this workflow:
   *
   * 1. Seller authenticates via registration.
   * 2. Creates a product with basic information (note: requires valid category_id in test environment).
   * 3. Uploads multiple images with distinct display orders.
   * 4. Attempts to update one image's display order to conflict with another image's existing position.
   * 5. Validates the system rejects the update with a 409 conflict error.
   *
   * This test ensures data integrity for product image ordering and proper error handling when business rules are violated.
   */
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Create a product
  // Note: Requires valid category_id - test environment should have pre-seeded categories
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Upload multiple images with distinct display orders
  const image1 = await generate_random_ecommerce_seller_products_images_create(
    sellerConnection,
    {
      body: {
        image_url: typia.random<
          string & tags.MaxLength<80000> & tags.Format<"uri">
        >(),
      } satisfies IEcommerceProductImage.ICreate,
      params: {
        productId: product.id,
      },
    },
  );
  typia.assert(image1);
  const image2 = await generate_random_ecommerce_seller_products_images_create(
    sellerConnection,
    {
      body: {
        image_url: typia.random<
          string & tags.MaxLength<80000> & tags.Format<"uri">
        >(),
      } satisfies IEcommerceProductImage.ICreate,
      params: {
        productId: product.id,
      },
    },
  );
  typia.assert(image2);
  // Verify images have distinct display orders
  TestValidator.notEquals(
    "images have distinct display orders",
    image1.displayOrder,
    image2.displayOrder,
  );
  // 4. Attempt to update image1's display order to conflict with image2's display order
  await TestValidator.httpError(
    "display order conflict rejected with 409",
    409,
    async () => {
      await api.functional.ecommerce.seller.products.images.update(
        sellerConnection,
        {
          productId: product.id,
          imageId: image1.id,
          body: {
            display_order: image2.displayOrder,
          } satisfies IEcommerceProductImage.IUpdate,
        },
      );
    },
  );
  // 5. Verify the original display order remains unchanged
  const updatedImage1 =
    await api.functional.ecommerce.seller.products.images.update(
      sellerConnection,
      {
        productId: product.id,
        imageId: image1.id,
        body: {
          image_url: typia.random<
            string & tags.MaxLength<80000> & tags.Format<"uri">
          >(),
        } satisfies IEcommerceProductImage.IUpdate,
      },
    );
  typia.assert(updatedImage1);
  TestValidator.equals(
    "original display order preserved after failed conflict update",
    updatedImage1.displayOrder,
    image1.displayOrder,
  );
}