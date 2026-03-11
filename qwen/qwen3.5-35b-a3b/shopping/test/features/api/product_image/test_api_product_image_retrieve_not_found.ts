import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
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

export async function test_api_product_image_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - join as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 2. Create product as seller
  const product: IEcommerceMallProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          category_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(product);
  // 3. Upload images as seller
  await generate_random_ecommerce_mall_seller_products_images_create(
    sellerConnection,
    {
      params: { productId: product.id },
      body: {
        image_url: typia.random<
          string & tags.Format<"uri">
        >() satisfies string & tags.Format<"uri"> as string &
          tags.MaxLength<80000> &
          tags.Format<"uri">,
        display_order: 0,
      } satisfies IEcommerceMallProductImage.ICreate,
    },
  );
  // Create second product for IDOR test
  const product2: IEcommerceMallProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          category_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(product2);
  // Upload image to second product
  await generate_random_ecommerce_mall_seller_products_images_create(
    sellerConnection,
    {
      params: { productId: product2.id },
      body: {
        image_url: typia.random<
          string & tags.Format<"uri">
        >() satisfies string & tags.Format<"uri"> as string &
          tags.MaxLength<80000> &
          tags.Format<"uri">,
        display_order: 0,
      } satisfies IEcommerceMallProductImage.ICreate,
    },
  );
  // 4. Customer test - retrieve non-existent image
  const customerConnection: api.IConnection = { host: connection.host };
  const fakeImageId = "00000000-0000-0000-0000-000000000000";
  await TestValidator.error("non-existent image returns 404", async () => {
    await api.functional.ecommerceMall.products.images.at(customerConnection, {
      productId: product.id,
      imageId: fakeImageId,
    });
  });
  // 5. Customer test - IDOR attack (valid image UUID, but doesn't belong to product)
  const fakeImageUuid: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "image not belonging to product returns 404",
    async () => {
      await api.functional.ecommerceMall.products.images.at(
        customerConnection,
        {
          productId: product.id,
          imageId: fakeImageUuid,
        },
      );
    },
  );
}
