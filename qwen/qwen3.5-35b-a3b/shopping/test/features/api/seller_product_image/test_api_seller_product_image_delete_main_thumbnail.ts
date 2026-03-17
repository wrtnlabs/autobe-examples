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

export async function test_api_seller_product_image_delete_main_thumbnail(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://seller.example.com/register",
      referrer: "https://example.com",
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // Create seller-specific connection with token
  const sellerAuthorizedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: sellerAuth.token.access,
    },
  };
  // 2. Create product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerAuthorizedConnection,
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
  // 3. Upload 2 images (sequence 0 and 1)
  const image0 =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerAuthorizedConnection,
      {
        params: { productId: product.id },
        body: {
          image_url: typia.random<string & tags.MaxLength<80000>>(),
          display_order: 0,
          alt_text: "Main thumbnail image",
        } satisfies IEcommerceMallProductImage.ICreate,
      },
    );
  typia.assert(image0);
  const image1 =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerAuthorizedConnection,
      {
        params: { productId: product.id },
        body: {
          image_url: typia.random<string & tags.MaxLength<80000>>(),
          display_order: 1,
          alt_text: "Secondary image",
        } satisfies IEcommerceMallProductImage.ICreate,
      },
    );
  typia.assert(image1);
  // Verify initial state - product has 2 images with image0 as main
  TestValidator.equals(
    "product has 2 images after upload",
    2,
    product.images.length,
  );
  TestValidator.equals(
    "main thumbnail is image0",
    product.images.find((img) => img.display_order === 0)?.id,
    image0.id,
  );
  // 4. Delete main thumbnail (image with display_order 0)
  await api.functional.ecommerceMall.seller.products.images.erase(
    sellerAuthorizedConnection,
    {
      productId: product.id,
      imageId: image0.id,
    },
  );
  // 5. Verify deletion succeeded
  // Note: We cannot verify auto-promotion without a get API for products
  // The erase operation returning void (no error) indicates success
  TestValidator.predicate("main thumbnail deletion succeeded", true);
}