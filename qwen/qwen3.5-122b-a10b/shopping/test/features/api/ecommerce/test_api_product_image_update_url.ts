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

/**
 * Test updating a product image's URL while maintaining its display order position.
 *
 * Validates the image URL update workflow for seller-owned products. A seller authenticates, creates a product, uploads an initial image, then updates that image's URL to a new valid URI. The system accepts the update, returns the updated image entity with the new URL, and preserves the original display order.
 *
 * This test validates the primary success path for image URL updates without affecting thumbnail selection or image ordering. It ensures that only the URL field changes while all other properties remain intact.
 *
 * 1. Create seller connection and authenticate via seller join.
 * 2. Create a product owned by the authenticated seller with required fields.
 * 3. Upload an initial image to the product with a valid URI.
 * 4. Update the image's URL to a new valid URI while preserving display order.
 * 5. Validate the response contains the updated URL matching the new URI.
 * 6. Validate the display order remains unchanged after the update.
 * 7. Verify the image still belongs to the correct product via product ID match.
 */
export async function test_api_product_image_update_url(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller connection and authenticate
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
  // 2. Create a product owned by the seller
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
  // 3. Upload an initial image to the product
  const initialImageUrl = `https://example.com/images/initial-${RandomGenerator.alphaNumeric(8)}.jpg`;
  const image = await generate_random_ecommerce_seller_products_images_create(
    sellerConnection,
    {
      body: {
        image_url: initialImageUrl,
      } satisfies IEcommerceProductImage.ICreate,
      params: {
        productId: product.id,
      },
    },
  );
  typia.assert(image);
  // Store original display order for validation
  const originalDisplayOrder = image.displayOrder;
  // 4. Update the image's URL to a new valid URI
  const newImageUrl = `https://example.com/images/updated-${RandomGenerator.alphaNumeric(8)}.jpg`;
  const updatedImage =
    await api.functional.ecommerce.seller.products.images.update(
      sellerConnection,
      {
        productId: product.id,
        imageId: image.id,
        body: {
          image_url: newImageUrl,
        } satisfies IEcommerceProductImage.IUpdate,
      },
    );
  typia.assert(updatedImage);
  // 5. Validate the response contains the updated URL
  TestValidator.equals("image URL updated", updatedImage.imageUrl, newImageUrl);
  // 6. Validate the display order is preserved
  TestValidator.equals(
    "display order preserved",
    updatedImage.displayOrder,
    originalDisplayOrder,
  );
  // 7. Verify the image still belongs to the correct product
  TestValidator.equals(
    "product ID unchanged",
    updatedImage.product.id,
    product.id,
  );
}
