import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
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

export async function test_api_product_image_upload_first_image(
  connection: api.IConnection,
): Promise<void> {
  // Create seller-specific connection
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // Create a product
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // Upload the first image with position 1
  const imageBody = {
    image_url: typia.random<string & tags.Format<"uri">>(),
    position: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IEcommerceProductImage.ICreate;
  const imageResponse =
    await api.functional.ecommerce.seller.products.images.create(
      sellerConnection,
      {
        productId: product.id,
        body: imageBody,
      },
    );
  typia.assert(imageResponse);
  // Validate business logic - position should be 1 for first image
  TestValidator.equals("image should be position 1", imageResponse.position, 1);
  // Validate product-image association
  TestValidator.equals(
    "image should belong to correct product",
    imageResponse.product.id,
    product.id,
  );
  // Validate seller ownership through product association
  TestValidator.equals(
    "product should belong to seller via shop name",
    imageResponse.product.seller.shop_name,
    product.seller.shop_name,
  );
}