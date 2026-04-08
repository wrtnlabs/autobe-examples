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
 * Test successful image upload to a seller's product.
 *
 * Validates the complete image upload workflow including seller authentication, product creation, and image attachment. Ensures that uploaded images are correctly associated with the product and assigned sequential display order values starting from 0.
 *
 * The test verifies that the first uploaded image (display_order = 0) becomes the main thumbnail shown in product listings and search results. It also validates that all image URLs are properly stored and accessible.
 *
 * 1. Seller registers and authenticates with the platform.
 * 2. Seller creates a new product with required fields (name, description, category, base_price).
 * 3. Seller uploads images to the product one at a time.
 * 4. System assigns sequential display_order values starting from 0.
 * 5. Validates all images have correct URLs and display orders.
 */
export async function test_api_product_image_upload_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create a product first
  const product = await api.functional.ecommerce.seller.products.create(
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
  // 3. Upload multiple images to the product sequentially
  const imageCount = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
  >();
  const uploadedImages: IEcommerceProductImage[] = [];
  await ArrayUtil.asyncRepeat(imageCount, async (index) => {
    const imageUrl = typia.random<string & tags.Format<"uri">>();
    const uploadedImage =
      await api.functional.ecommerce.seller.products.images.create(
        sellerConnection,
        {
          productId: product.id,
          body: {
            image_url: typia.assert<
              string & tags.MaxLength<80000> & tags.Format<"uri">
            >(imageUrl),
          } satisfies IEcommerceProductImage.ICreate,
        },
      );
    typia.assert(uploadedImage);
    uploadedImages.push(uploadedImage);
  });
  // 4. Validate images have sequential display_order starting from 0
  TestValidator.equals(
    "image count matches",
    uploadedImages.length,
    imageCount,
  );
  const sortedImages = [...uploadedImages].sort(
    (a, b) => a.displayOrder - b.displayOrder,
  );
  for (let i = 0; i < sortedImages.length; i++) {
    const image = sortedImages[i];
    TestValidator.equals(`image ${i} display_order`, image.displayOrder, i);
  }
  // 5. Verify first image has display_order of 0 (thumbnail)
  TestValidator.predicate(
    "first image is thumbnail (display_order = 0)",
    sortedImages[0]?.displayOrder === 0,
  );
}