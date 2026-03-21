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

/**
 * Test that the system prevents cross-seller modification by rejecting attempts
 * to update product images belonging to another seller.
 *
 * Scenario:
 * 1. Seller A registers and creates a product with an image
 * 2. Seller B registers (different seller account)
 * 3. Seller B attempts to update the image URL for seller A's product
 * 4. System must return 403 Forbidden error rejecting the request
 *
 * This validates the business rule that sellers can only modify images for products they own.
 */
export async function test_api_product_image_update_by_non_owner_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register and authenticate seller A (product owner)
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerARegistration = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/seller-a",
      referrer: "https://example.com",
    },
  });
  typia.assert(sellerARegistration);
  // Step 2: Seller A creates a product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerAConnection,
    {},
  );
  typia.assert(product);
  // Step 3: Seller A adds an image to the product
  const productImage =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerAConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(productImage);
  // Step 4: Register and authenticate seller B (non-owner)
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/seller-b",
      referrer: "https://example.com",
    },
  });
  // Step 5: Seller B attempts to update seller A's product image
  // This must fail with 403 Forbidden
  await TestValidator.error(
    "non-owner cannot update another seller's product image",
    async () => {
      await api.functional.ecommerceMall.seller.products.images.update(
        sellerBConnection,
        {
          productId: product.id,
          imageId: productImage.id,
          body: {
            image_url: "https://example.com/updated-image.jpg",
          } satisfies IEcommerceMallProductImage.IUpdate,
        },
      );
    },
  );
}
