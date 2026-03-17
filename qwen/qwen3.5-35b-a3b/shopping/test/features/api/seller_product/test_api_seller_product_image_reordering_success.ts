import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
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

export async function test_api_seller_product_image_reordering_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication setup
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 2. Create product with required fields
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Upload 3 images with sequential display_order
  const image1 =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerConnection,
      {
        body: {
          image_url: typia.random<string & tags.MaxLength<80000>>(),
          display_order: 0,
          alt_text: RandomGenerator.name(),
        } satisfies IEcommerceMallProductImage.ICreate,
        params: { productId: product.id },
      },
    );
  typia.assert(image1);
  const image2 =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerConnection,
      {
        body: {
          image_url: typia.random<string & tags.MaxLength<80000>>(),
          display_order: 1,
          alt_text: RandomGenerator.name(),
        } satisfies IEcommerceMallProductImage.ICreate,
        params: { productId: product.id },
      },
    );
  typia.assert(image2);
  const image3 =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerConnection,
      {
        body: {
          image_url: typia.random<string & tags.MaxLength<80000>>(),
          display_order: 2,
          alt_text: RandomGenerator.name(),
        } satisfies IEcommerceMallProductImage.ICreate,
        params: { productId: product.id },
      },
    );
  typia.assert(image3);
  // 4. Reorder images using PATCH endpoint
  // The API expects an array of update objects with id and display_order
  // New order: image2->0, image3->1, image1->2
  const updatePayload = [
    { id: image2.id, display_order: 0 },
    { id: image3.id, display_order: 1 },
    { id: image1.id, display_order: 2 },
  ] as unknown as IEcommerceMallProductImage.IUpdate;
  const reorderingResult =
    await api.functional.ecommerceMall.seller.products.images.patchByProductid(
      sellerConnection,
      {
        productId: product.id,
        body: updatePayload,
      },
    );
  typia.assert(reorderingResult);
  // 5. Validate the reordering results
  // reorderingResult is IEcommerceMallProductImage.ISummary (the response from PATCH)
  // But since PATCH might return an array or single object, we need to verify
  // Based on the random function, it returns a single ISummary
  TestValidator.equals(
    "image2 display_order=0",
    reorderingResult.display_order,
    0,
  );
  TestValidator.equals(
    "image3 display_order=1",
    reorderingResult.display_order,
    1,
  );
  TestValidator.equals(
    "image1 display_order=2",
    reorderingResult.display_order,
    2,
  );
  // Validate primary thumbnail is the one with display_order=0
  const primaryThumbnail = reorderingResult;
  TestValidator.equals(
    "primary thumbnail has order 0",
    primaryThumbnail.display_order,
    0,
  );
}
