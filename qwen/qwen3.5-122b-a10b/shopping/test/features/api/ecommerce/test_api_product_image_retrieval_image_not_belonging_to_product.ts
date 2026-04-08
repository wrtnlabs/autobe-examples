import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
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
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";

export async function test_api_product_image_retrieval_image_not_belonging_to_product(
  connection: api.IConnection,
): Promise<void> {
  // 1. First seller registers and creates first product
  const firstSellerConnection: api.IConnection = { host: connection.host };
  const firstSeller = await authorize_seller_join(firstSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(firstSeller);
  const firstProduct = await generate_random_ecommerce_seller_products_create(
    firstSellerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies DeepPartial<IEcommerceProduct.ICreate>,
    },
  );
  typia.assert(firstProduct);
  // 2. First seller uploads an image to first product
  const firstImage =
    await generate_random_ecommerce_seller_products_images_create(
      firstSellerConnection,
      {
        body: {
          image_url: typia.random<
            string & tags.MaxLength<80000> & tags.Format<"uri">
          >(),
        } satisfies DeepPartial<IEcommerceProductImage.ICreate>,
        params: {
          productId: firstProduct.id,
        },
      },
    );
  typia.assert(firstImage);
  // 3. Second seller registers and creates second product
  const secondSellerConnection: api.IConnection = { host: connection.host };
  const secondSeller = await authorize_seller_join(secondSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(secondSeller);
  const secondProduct = await generate_random_ecommerce_seller_products_create(
    secondSellerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies DeepPartial<IEcommerceProduct.ICreate>,
    },
  );
  typia.assert(secondProduct);
  // 4. Attempt to retrieve first product's image using second product's ID
  // This should fail with 404 Not Found
  await TestValidator.httpError(
    "image retrieval with mismatched product ID returns 404",
    404,
    async () => {
      await api.functional.ecommerce.products.images.at(firstSellerConnection, {
        productId: secondProduct.id,
        imageId: firstImage.id,
      });
    },
  );
}
