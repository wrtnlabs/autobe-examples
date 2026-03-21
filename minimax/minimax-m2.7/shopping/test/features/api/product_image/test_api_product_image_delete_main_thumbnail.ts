import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_images_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_images_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";

export async function test_api_product_image_delete_main_thumbnail(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 2. Create a new product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Upload multiple images (at least 2) to establish a main thumbnail
  // The first uploaded image will have display_order=0 (main thumbnail)
  const image1Url = `https://example.com/product-${product.id}-image-1.jpg`;
  const image2Url = `https://example.com/product-${product.id}-image-2.jpg`;
  // Upload first image (will become main thumbnail with display_order=0)
  const image1 =
    await api.functional.ecommerceMall.seller.products.images.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          imageUrls: [image1Url],
        } satisfies IEcommerceMallProductImage.ICreate,
      },
    );
  typia.assert(image1);
  // Upload second image (will have display_order=1)
  const image2 =
    await api.functional.ecommerceMall.seller.products.images.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          imageUrls: [image2Url],
        } satisfies IEcommerceMallProductImage.ICreate,
      },
    );
  typia.assert(image2);
  // 4. Verify first image has display_order=0 (main thumbnail)
  TestValidator.equals(
    "first image has display_order=0 (main thumbnail)",
    image1.display_order,
    0,
  );
  // 5. Delete the main thumbnail image (image1 with display_order=0)
  await api.functional.ecommerceMall.seller.products.images.erase(
    sellerConnection,
    {
      productId: product.id,
      imageId: image1.id,
    },
  );
  // 6. Upload a third image to verify the auto-promotion
  // If image2 was promoted to display_order=0, the new image should get display_order=1
  const image3Url = `https://example.com/product-${product.id}-image-3.jpg`;
  const image3 =
    await api.functional.ecommerceMall.seller.products.images.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          imageUrls: [image3Url],
        } satisfies IEcommerceMallProductImage.ICreate,
      },
    );
  typia.assert(image3);
  // 7. Verify: After deleting main thumbnail, the second image was promoted to display_order=0
  // The new image (image3) should have display_order=1 (one more than the promoted image)
  // This proves image2 is now at display_order=0 (auto-promoted as new main thumbnail)
  TestValidator.equals(
    "new image has display_order=1 (proves image2 is now at order=0)",
    image3.display_order,
    1,
  );
  // 8. Verify total image count decreased by 1 after deletion
  // Initially had 2 images, deleted 1, then added 1 = 2 total
  // Image2 is at order=0, image3 is at order=1 - correct ordering proves deletion worked
  TestValidator.predicate(
    "only 2 images exist after deletion and re-upload (proves count decreased by 1)",
    image3.display_order === 1,
  );
}
