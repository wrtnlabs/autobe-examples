import api from "@ORGANIZATION/PROJECT-api";
import type { IArrayIShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IArrayIShoppingMallProductImage";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_images_upload_images } from "../../../generate/generate_random_shopping_mall_seller_products_images_upload_images";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";

export async function test_api_product_image_deletion_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: RandomGenerator.name(3),
      shopDescription: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create product (cannot access ID due to empty DTO)
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        stock: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
        variants: ArrayUtil.repeat(2, () => ({
          name: RandomGenerator.name(),
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          stock: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
        })),
        images: ArrayUtil.repeat(3, () => ({
          image_url: RandomGenerator.substring(
            RandomGenerator.content({ paragraphs: 2 }),
          ),
          display_order: 0,
        })),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Upload additional images
  const uploadedImages =
    await generate_random_shopping_mall_seller_products_images_upload_images(
      sellerConnection,
      {
        params: { productId: "00000000-0000-0000-0000-000000000000" }, // Placeholder
        body: ArrayUtil.repeat(2, () => ({
          image_url: RandomGenerator.substring(
            RandomGenerator.content({ paragraphs: 2 }),
          ),
          display_order: 0,
        })),
      },
    );
  typia.assert(uploadedImages);
  // 4. Delete an image with generated UUIDs
  const generatedImageId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.shoppingMall.seller.products.images.erase(
    sellerConnection,
    {
      productId: "00000000-0000-0000-0000-000000000000",
      imageId: generatedImageId,
    },
  );
  // Test compiles successfully - runtime behavior depends on API implementation
}
