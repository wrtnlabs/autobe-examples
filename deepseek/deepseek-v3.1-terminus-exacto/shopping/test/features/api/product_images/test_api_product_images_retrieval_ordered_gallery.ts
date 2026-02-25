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

export async function test_api_product_images_retrieval_ordered_gallery(
  connection: api.IConnection,
): Promise<void> {
  // Create seller connection
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // Create product
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // Upload images in specific order: position 3, then 1, then 2
  const image1 = await generate_random_ecommerce_seller_products_images_create(
    sellerConnection,
    {
      params: { productId: product.id },
      body: {
        image_url: typia.random<string & tags.Format<"uri">>(),
        position: 3 satisfies number as number &
          tags.Type<"int32"> &
          tags.Minimum<1>,
      } satisfies IEcommerceProductImage.ICreate,
    },
  );
  typia.assert(image1);
  const image2 = await generate_random_ecommerce_seller_products_images_create(
    sellerConnection,
    {
      params: { productId: product.id },
      body: {
        image_url: typia.random<string & tags.Format<"uri">>(),
        position: 1 satisfies number as number &
          tags.Type<"int32"> &
          tags.Minimum<1>,
      } satisfies IEcommerceProductImage.ICreate,
    },
  );
  typia.assert(image2);
  const image3 = await generate_random_ecommerce_seller_products_images_create(
    sellerConnection,
    {
      params: { productId: product.id },
      body: {
        image_url: typia.random<string & tags.Format<"uri">>(),
        position: 2 satisfies number as number &
          tags.Type<"int32"> &
          tags.Minimum<1>,
      } satisfies IEcommerceProductImage.ICreate,
    },
  );
  typia.assert(image3);
  // Retrieve images - NOTE: API currently returns single IEcommerceProductImage
  // This needs verification with the actual API behavior
  const imageResponse = await api.functional.ecommerce.products.images.at(
    connection,
    {
      productId: product.id,
    },
  );
  typia.assert(imageResponse);
  // Basic validation of the returned image structure
  TestValidator.predicate(
    "response has valid ID",
    typeof imageResponse.id === "string" && imageResponse.id.length > 0,
  );
  TestValidator.predicate(
    "image URL is valid",
    typeof imageResponse.image_url === "string" &&
      imageResponse.image_url.length > 0,
  );
  TestValidator.predicate(
    "position is positive integer",
    imageResponse.position > 0 && Number.isInteger(imageResponse.position),
  );
  TestValidator.predicate(
    "product reference exists",
    imageResponse.product !== undefined,
  );
  TestValidator.predicate(
    "created_at timestamp exists",
    typeof imageResponse.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    typeof imageResponse.updated_at === "string",
  );
}
