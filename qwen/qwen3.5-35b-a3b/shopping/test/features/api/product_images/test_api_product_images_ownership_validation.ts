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
 * Test that only the product owner (seller) can upload images to a product.
 *
 * Validates the product image upload authorization by ensuring sellers cannot upload images
 * to products owned by other sellers. First, a seller (Seller A) registers and logs in,
 * then creates a product. Seller A successfully uploads an image to their own product.
 * Then, a second seller (Seller B) registers and logs in. Seller B attempts to upload
 * an image to Seller A's product, which should be rejected with a 403 Forbidden error.
 *
 * This test validates the ownership check ensures only the seller who owns the product
 * can manage its images, preventing unauthorized access to other sellers' product data.
 */
export async function test_api_product_images_ownership_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate Seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Create new connection with Seller A's token
  const sellerAAuthConnection: api.IConnection = { host: connection.host };
  sellerAAuthConnection.headers = sellerAConnection.headers;
  // 3. Seller A creates a product (uses pre-existing category UUID)
  const sellerAProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerAAuthConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          category_id: typia.random<string & tags.Format<"uuid">>(),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(sellerAProduct);
  // 4. Seller A uploads image to their own product (should succeed)
  const sellerAImage =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerAAuthConnection,
      {
        body: {
          image_url: typia.random<
            string & tags.MaxLength<80000> & tags.Format<"uri">
          >(),
          display_order: 1,
        } satisfies IEcommerceMallProductImage.ICreate,
        params: { productId: sellerAProduct.id },
      },
    );
  typia.assert(sellerAImage);
  // 5. Register and authenticate Seller B
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 6. Create new connection with Seller B's token
  const sellerBAuthConnection: api.IConnection = { host: connection.host };
  sellerBAuthConnection.headers = sellerBConnection.headers;
  // 7. Seller B attempts to upload image to Seller A's product (should fail with 403)
  await TestValidator.error(
    "unauthorized seller cannot upload to another seller's product",
    async () => {
      await generate_random_ecommerce_mall_seller_products_images_create(
        sellerBAuthConnection,
        {
          body: {
            image_url: typia.random<
              string & tags.MaxLength<80000> & tags.Format<"uri">
            >(),
            display_order: 1,
          } satisfies IEcommerceMallProductImage.ICreate,
          params: { productId: sellerAProduct.id },
        },
      );
    },
  );
}
