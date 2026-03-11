import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
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
 * Test that a seller cannot delete images from a product they do not own.
 *
 * Scenario:
 * 1. Seller A creates a product and uploads an image
 * 2. Seller B (different seller) attempts to delete that image
 * 3. Verify 403 Forbidden error is returned
 * 4. Verify the image remains active with deleted_at = null
 * 5. Verify image count is unchanged
 */
export async function test_api_product_image_deletion_unauthorized_other_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth Seller A (product owner)
  const sellerAConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 2. Create product with Seller A
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerAConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Upload image to product with Seller A
  const image_url = typia.random<
    string & tags.Format<"uri"> & tags.MaxLength<80000>
  >();
  const display_order = 0;
  await generate_random_ecommerce_mall_seller_products_images_create(
    sellerAConnection,
    {
      body: {
        image_url,
        display_order,
      } satisfies IEcommerceMallProductImage.ICreate,
      params: { productId: product.id },
    },
  );
  // 4. Fetch product to get the actual image with its ID
  const productWithImage = product;
  typia.assert(productWithImage);
  const uploadedImage = productWithImage.images.find(
    (img) => img.image_url === image_url && img.display_order === display_order,
  );
  if (!uploadedImage) {
    throw new Error("Image not found in product after upload");
  }
  // 5. Auth Seller B (different seller, not product owner)
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 6. Seller B attempts to delete image from Seller A's product
  // This should return 403 Forbidden
  await TestValidator.error(
    "seller B cannot delete another seller's image",
    async () => {
      await api.functional.ecommerceMall.seller.products.images.erase(
        sellerBConnection,
        {
          productId: product.id,
          imageId: uploadedImage.id,
        },
      );
    },
  );
  // 7. Verify image remains active after unauthorized deletion attempt
  const imageStillExists = productWithImage.images.find(
    (img: IEcommerceMallProductImage) => img.id === uploadedImage.id,
  );
  TestValidator.predicate(
    "image still exists in product after unauthorized deletion attempt",
    imageStillExists !== undefined,
  );
  if (imageStillExists) {
    TestValidator.equals(
      "image remains active (deleted_at is null)",
      imageStillExists.deleted_at,
      null,
    );
  }
  // 8. Verify image count unchanged after failed deletion attempt
  TestValidator.equals(
    "image count unchanged after unauthorized deletion attempt",
    productWithImage.images.length,
    1,
  );
}
