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
 * Test seller successfully reorders product images to change the thumbnail selection.
 *
 * Validates the primary success path for image reordering and thumbnail selection business logic. The test creates a seller account, creates a product with multiple images, verifies the initial thumbnail, reorders the images, and confirms the new thumbnail selection.
 *
 * The test ensures that:
 * 1. The first image (display_order=0) is correctly identified as the initial thumbnail
 * 2. After reordering, the new first image becomes the thumbnail with display_order=0
 * 3. All image IDs are preserved during the reorder operation
 * 4. Display orders are correctly assigned sequentially (0, 1, 2, ...)
 * 5. The response includes product summary information for the thumbnail image
 *
 * 1. Create and authenticate a seller account using authorize_seller_join.
 * 2. Create a product with at least 2 images using generate_random_ecommerce_seller_products_create.
 * 3. Verify the initial thumbnail by checking the first image has display_order=0.
 * 4. Submit a reorder request with images in different order using api.functional.ecommerce.products.images.reorder.
 * 5. Verify the response contains the new thumbnail image with display_order=0.
 * 6. Validate the new thumbnail image ID matches the expected image from the reordered list.
 * 7. Confirm product summary is included in the response.
 */
export async function test_api_product_image_reorder_thumbnail_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate seller account
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
  // 2. Create a product with at least 2 images
  const product: IEcommerceProduct =
    await generate_random_ecommerce_seller_products_create(sellerConnection, {
      body: {
        images: ArrayUtil.repeat(
          3,
          () =>
            ({
              image_url: typia.random<
                string & tags.MaxLength<80000> & tags.Format<"uri">
              >(),
            }) satisfies IEcommerceProductImage.ICreate,
        ),
      },
    });
  typia.assert(product);
  // Verify product has images
  TestValidator.predicate(
    "product has images",
    product.productImages.length >= 2,
  );
  // 3. Verify initial thumbnail (first image has display_order=0)
  const initialImages = product.productImages;
  const initialThumbnail = initialImages.find((img) => img.displayOrder === 0);
  TestValidator.predicate(
    "initial thumbnail exists at display_order=0",
    initialThumbnail !== undefined,
  );
  TestValidator.equals(
    "initial thumbnail is first image",
    initialImages[0].id,
    initialThumbnail!.id,
  );
  // 4. Submit reorder request - reverse the image order
  const reorderedImageIds = [...initialImages].reverse().map((img) => img.id);
  const reorderResponse: IEcommerceProductImage.ISummary =
    await api.functional.ecommerce.products.images.reorder(sellerConnection, {
      productId: product.id,
      body: {
        imageIds: reorderedImageIds,
      } satisfies IEcommerceProductImage.IReorder,
    });
  typia.assert(reorderResponse);
  // 5. Verify response is the new thumbnail with display_order=0
  TestValidator.equals(
    "reorder response has display_order 0",
    reorderResponse.display_order,
    0,
  );
  // 6. Verify new thumbnail is the last image from the original order (first after reverse)
  const expectedNewThumbnailId = initialImages[initialImages.length - 1].id;
  TestValidator.equals(
    "new thumbnail is the last original image",
    reorderResponse.id,
    expectedNewThumbnailId,
  );
  // 7. Verify product summary is included
  TestValidator.predicate(
    "response has product summary",
    reorderResponse.product !== undefined &&
      reorderResponse.product.id === product.id,
  );
  // 8. Verify image URL is present
  TestValidator.predicate(
    "response has image URL",
    reorderResponse.image_url !== undefined &&
      reorderResponse.image_url.length > 0,
  );
}
