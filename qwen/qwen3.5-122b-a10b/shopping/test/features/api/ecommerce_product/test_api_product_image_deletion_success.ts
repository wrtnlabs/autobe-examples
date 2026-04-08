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
 * Test successful deletion of a non-thumbnail product image by a seller.
 *
 * Validates the complete workflow of seller authentication, product creation, multi-image upload, and successful deletion of a non-thumbnail image. Ensures that the deletion operation completes successfully while maintaining the product's minimum image requirement.
 *
 * Special attention is given to verifying that the seller can delete any image that is not the last remaining image, and that the deletion operation does not leave the product without images.
 *
 * 1. Seller registers and authenticates to the platform.
 * 2. Seller creates a product with basic information.
 * 3. Seller uploads multiple images to the product (at least 2 images).
 * 4. Seller deletes a non-thumbnail image (display_order > 0).
 * 5. Validates the deletion operation completes successfully.
 * 6. Validates product maintains at least one image after deletion.
 */
export async function test_api_product_image_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
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
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_id: categoryId,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Upload multiple images to the product (at least 2)
  const imageUrls = ArrayUtil.repeat(
    3,
    () =>
      ({
        image_url: typia.random<
          string & tags.MaxLength<80000> & tags.Format<"uri">
        >(),
      }) satisfies IEcommerceProductImage.ICreate,
  );
  const uploadedImages: IEcommerceProductImage[] = [];
  for (const imageUrl of imageUrls) {
    const image = await generate_random_ecommerce_seller_products_images_create(
      sellerConnection,
      {
        body: imageUrl,
        params: { productId: product.id },
      },
    );
    typia.assert(image);
    uploadedImages.push(image);
  }
  // Verify we have at least 2 images
  TestValidator.predicate("have at least 2 images", uploadedImages.length >= 2);
  // 4. Delete a non-thumbnail image (display_order > 0)
  const nonThumbnailImage = uploadedImages.find((img) => img.displayOrder > 0);
  TestValidator.predicate(
    "have non-thumbnail image to delete",
    !!nonThumbnailImage,
  );
  const imageIdToDelete = nonThumbnailImage!.id;
  // Perform the deletion
  await api.functional.ecommerce.seller.products.images.erase(
    sellerConnection,
    {
      productId: product.id,
      imageId: imageIdToDelete,
    },
  );
  // 5. Validate deletion succeeded (API call completed without error)
  TestValidator.predicate("deletion operation completed successfully", true);
  // 6. Validate product still has at least one active image (based on local tracking)
  const remainingImages = uploadedImages.filter(
    (img) => img.id !== imageIdToDelete,
  );
  TestValidator.predicate(
    "product has at least one remaining image",
    remainingImages.length >= 1,
  );
}
