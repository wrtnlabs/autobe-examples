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

export async function test_api_product_image_retrieval_not_found_cases(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create a seller account and get authenticated
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  sellerConnection.headers = {
    ...sellerConnection.headers,
    Authorization: sellerAuth.token.access,
  };
  // Setup: Create first product owned by seller
  const firstProduct =
    await api.functional.ecommerceMall.seller.products.create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 3,
            sentenceMax: 5,
          }),
          category_id: typia.random<string & tags.Format<"uuid">>(),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(firstProduct);
  // Upload first image to first product
  const firstImage =
    await api.functional.ecommerceMall.seller.products.images.create(
      sellerConnection,
      {
        productId: firstProduct.id,
        body: {
          image_url: typia.random<string & tags.Format<"uri">>() satisfies string as string,
          display_order: 1,
        } satisfies IEcommerceMallProductImage.ICreate,
      },
    );
  typia.assert(firstImage);
  // Setup: Create second product for cross-product test
  const secondProduct =
    await api.functional.ecommerceMall.seller.products.create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 3,
            sentenceMax: 5,
          }),
          category_id: typia.random<string & tags.Format<"uuid">>(),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(secondProduct);
  // Upload second image to second product
  const secondImage =
    await api.functional.ecommerceMall.seller.products.images.create(
      sellerConnection,
      {
        productId: secondProduct.id,
        body: {
          image_url: typia.random<string & tags.Format<"uri">>() satisfies string as string,
          display_order: 1,
        } satisfies IEcommerceMallProductImage.ICreate,
      },
    );
  typia.assert(secondImage);
  // Test Case 1: Non-existent Product
  await TestValidator.httpError(
    "should return 404 for non-existent product",
    [404],
    async () => {
      await api.functional.ecommerceMall.seller.products.images.at(
        sellerConnection,
        {
          productId: typia.random<string & tags.Format<"uuid">>(),
          imageId: firstImage.id,
        },
      );
    },
  );
  // Test Case 2: Non-existent Image
  await TestValidator.httpError(
    "should return 404 for non-existent image",
    [404],
    async () => {
      await api.functional.ecommerceMall.seller.products.images.at(
        sellerConnection,
        {
          productId: firstProduct.id,
          imageId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // Test Case 3: Image belongs to different product
  await TestValidator.httpError(
    "should return 404 for image from different product",
    [404],
    async () => {
      await api.functional.ecommerceMall.seller.products.images.at(
        sellerConnection,
        {
          productId: firstProduct.id,
          imageId: secondImage.id,
        },
      );
    },
  );
}