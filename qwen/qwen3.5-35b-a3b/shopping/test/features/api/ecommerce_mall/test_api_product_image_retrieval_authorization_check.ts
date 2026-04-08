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
 * Test authorization boundaries for product image retrieval - seller attempting to retrieve another seller's product image.
 *
 * Validates that sellers cannot access product images they don't own by attempting to retrieve another seller's product image. Tests the security boundary preventing cross-ownership access even when valid UUIDs are provided.
 *
 * Special attention is given to verifying that the authorization check properly validates product ownership before returning any image data, and that appropriate error responses are returned for unauthorized access attempts.
 *
 * 1. Seller A registers and authenticates to the platform.
 * 2. Seller A creates a product with name and pricing.
 * 3. Seller A uploads an image to their product.
 * 4. Seller B registers and authenticates (different seller account).
 * 5. Seller B creates their own product and uploads image.
 * 6. Seller B attempts to retrieve Seller A's product image using Seller A's product and image IDs.
 * 7. Verify 403 Forbidden or 404 Not Found response indicating access denied.
 * 8. Verify error message indicates insufficient permissions or product not accessible.
 */
export async function test_api_product_image_retrieval_authorization_check(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller A authentication and setup
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAJoin = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAJoin);
  // 2. Seller A creates product
  const productA = await generate_random_ecommerce_mall_seller_products_create(
    sellerAConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number &
            tags.Type<"uint32"> &
            tags.Minimum<1000> &
            tags.Maximum<100000>
        >(),
      },
    },
  );
  typia.assert(productA);
  // 3. Seller A uploads image to their product
  const imageA =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerAConnection,
      {
        params: {
          productId: productA.id,
        },
        body: {
          image_url: typia.assert<string & tags.MaxLength<80000> & tags.Format<"uri">>(typia.random<string & tags.Format<"uri">>()),
          display_order: 1,
        },
      },
    );
  typia.assert(imageA);
  // 4. Seller B authentication and setup (different seller)
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBJoin = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerBJoin);
  // 5. Seller B creates their own product
  const productB = await generate_random_ecommerce_mall_seller_products_create(
    sellerBConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number &
            tags.Type<"uint32"> &
            tags.Minimum<1000> &
            tags.Maximum<100000>
        >(),
      },
    },
  );
  typia.assert(productB);
  // 6. Seller B uploads image to their own product
  const imageB =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerBConnection,
      {
        params: {
          productId: productB.id,
        },
        body: {
          image_url: typia.assert<string & tags.MaxLength<80000> & tags.Format<"uri">>(typia.random<string & tags.Format<"uri">>()),
          display_order: 1,
        },
      },
    );
  typia.assert(imageB);
  // 7. Seller B attempts to retrieve Seller A's product image (unauthorized access)
  await TestValidator.error(
    "seller B cannot access seller A's product image",
    async () => {
      await api.functional.ecommerceMall.seller.products.images.at(
        sellerBConnection,
        {
          productId: productA.id,
          imageId: imageA.id,
        },
      );
    },
  );
  // 8. Verify Seller B can still access their own product image (authorized)
  const ownImage = await api.functional.ecommerceMall.seller.products.images.at(
    sellerBConnection,
    {
      productId: productB.id,
      imageId: imageB.id,
    },
  );
  typia.assert(ownImage);
  TestValidator.equals("own image accessible", ownImage.id, imageB.id);
}