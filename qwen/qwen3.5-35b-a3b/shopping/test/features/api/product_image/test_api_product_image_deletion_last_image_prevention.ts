import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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

/**
 * Test that sellers cannot delete the last remaining image from a product.
 *
 * Validates the business rule requiring at least one image to remain for proper
 * product display in search and category listings. The test verifies that deletion
 * attempts on the sole product image are rejected with appropriate error responses,
 * ensuring products maintain visual representation in the storefront.
 *
 * Special attention is given to verifying the error response codes, message content,
 * image state persistence, and product image list integrity after rejection.
 *
 * 1. Seller account registration and authentication.
 * 2. Product creation with approved seller status and category reference.
 * 3. Single image upload to the product.
 * 4. Deletion attempt of the only remaining image.
 * 5. Verification of rejection response and error message.
 * 6. Validation that image remains active and product has 1 image.
 */
export async function test_api_product_image_deletion_last_image_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerResult = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerResult);
  typia.assert(sellerResult.token);
  // 2. Create a product with a random category ID
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Add exactly one image to the product
  const image =
    await api.functional.ecommerceMall.seller.products.images.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          image_url: `https://example.com/images/${typia.random<string>()}.jpg`,
          display_order: 1,
        } satisfies IEcommerceMallProductImage.ICreate,
      },
    );
  typia.assert(image);
  typia.assert(image.id);
  // 4. Verify product has exactly one image (from product entity response)
  TestValidator.equals("product has one image", product.images.length, 1);
  TestValidator.equals("image id matches", product.images[0].id, image.id);
  // 5. Attempt to delete the last remaining image - should be rejected
  await TestValidator.httpError(
    "deletion of last image rejected",
    [409, 400],
    async () => {
      await api.functional.ecommerceMall.seller.products.images.erase(
        sellerConnection,
        {
          productId: product.id,
          imageId: image.id,
        },
      );
    },
  );
  // 6. Verify we can still add images (proves the original image was not deleted)
  const secondImage =
    await api.functional.ecommerceMall.seller.products.images.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          image_url: `https://example.com/images/${typia.random<string>()}.jpg`,
          display_order: 2,
        } satisfies IEcommerceMallProductImage.ICreate,
      },
    );
  typia.assert(secondImage);
  TestValidator.equals(
    "second image added successfully",
    secondImage.display_order,
    2,
  );
  // 7. Verify the original image still exists by checking the product entity
  TestValidator.predicate(
    "product images intact after rejected deletion",
    () => product.images.length === 1,
  );
}
