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

export async function test_api_product_images_upload_success_path(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create seller-specific connection for authenticated requests
  const sellerAuthenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: sellerAuth.token.access,
    },
  };
  // 3. Create a product to upload images to
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerAuthenticatedConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Upload first image with display_order=1 (main thumbnail)
  const firstImage =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerAuthenticatedConnection,
      {
        params: { productId: product.id },
        body: {
          image_url: typia.random<string & tags.Format<"uri">>() satisfies string & tags.Format<"uri"> as string & tags.MaxLength<80000> & tags.Format<"uri">,
          display_order: 1,
        } satisfies IEcommerceMallProductImage.ICreate,
      },
    );
  typia.assert(firstImage);
  TestValidator.equals(
    "first image product_id",
    firstImage.product_id,
    product.id,
  );
  TestValidator.equals(
    "first image display_order",
    firstImage.display_order,
    1,
  );
  // 5. Upload second image with display_order=2
  const secondImage =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerAuthenticatedConnection,
      {
        params: { productId: product.id },
        body: {
          image_url: typia.random<string & tags.Format<"uri">>() satisfies string & tags.Format<"uri"> as string & tags.MaxLength<80000> & tags.Format<"uri">,
          display_order: 2,
        } satisfies IEcommerceMallProductImage.ICreate,
      },
    );
  typia.assert(secondImage);
  TestValidator.equals(
    "second image product_id",
    secondImage.product_id,
    product.id,
  );
  TestValidator.equals(
    "second image display_order",
    secondImage.display_order,
    2,
  );
  // 6. Upload third image with display_order=3
  const thirdImage =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerAuthenticatedConnection,
      {
        params: { productId: product.id },
        body: {
          image_url: typia.random<string & tags.Format<"uri">>() satisfies string & tags.Format<"uri"> as string & tags.MaxLength<80000> & tags.Format<"uri">,
          display_order: 3,
        } satisfies IEcommerceMallProductImage.ICreate,
      },
    );
  typia.assert(thirdImage);
  TestValidator.equals(
    "third image product_id",
    thirdImage.product_id,
    product.id,
  );
  TestValidator.equals(
    "third image display_order",
    thirdImage.display_order,
    3,
  );
  // 7. Verify all uploaded images have valid UUIDs
  TestValidator.predicate(
    "first image has valid UUID",
    /^[0-9a-f-]{36}$/i.test(firstImage.id),
  );
  TestValidator.predicate(
    "second image has valid UUID",
    /^[0-9a-f-]{36}$/i.test(secondImage.id),
  );
  TestValidator.predicate(
    "third image has valid UUID",
    /^[0-9a-f-]{36}$/i.test(thirdImage.id),
  );
  // 8. Verify image URLs are properly formatted URIs
  TestValidator.predicate(
    "first image URL valid",
    firstImage.image_url.startsWith("http://") ||
      firstImage.image_url.startsWith("https://"),
  );
  TestValidator.predicate(
    "second image URL valid",
    secondImage.image_url.startsWith("http://") ||
      secondImage.image_url.startsWith("https://"),
  );
  TestValidator.predicate(
    "third image URL valid",
    thirdImage.image_url.startsWith("http://") ||
      thirdImage.image_url.startsWith("https://"),
  );
  // 9. Verify display order sequence is correct
  TestValidator.equals(
    "display order sequence",
    firstImage.display_order + 1,
    secondImage.display_order,
  );
  TestValidator.equals(
    "display order sequence",
    secondImage.display_order + 1,
    thirdImage.display_order,
  );
}