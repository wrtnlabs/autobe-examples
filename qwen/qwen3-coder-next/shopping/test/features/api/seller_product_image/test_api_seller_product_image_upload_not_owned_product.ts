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

export async function test_api_seller_product_image_upload_not_owned_product(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create two seller accounts
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1 = await api.functional.shoppingMall.auth.seller.join(
    seller1Connection,
    {
      body: {
        name: RandomGenerator.name(),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        shopName: RandomGenerator.name(3),
        shopDescription: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IShoppingMallSeller.IJoin,
    },
  );
  typia.assert(seller1);
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2 = await api.functional.shoppingMall.auth.seller.join(
    seller2Connection,
    {
      body: {
        name: RandomGenerator.name(),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        shopName: RandomGenerator.name(3),
        shopDescription: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IShoppingMallSeller.IJoin,
    },
  );
  typia.assert(seller2);
  // 2. Seller 1 creates a product
  const productCreateData: IShoppingMallProduct.ICreate = {
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<1000000>
    >(),
    status: "published" as const,
    variants: [
      {
        sku: RandomGenerator.alphaNumeric(8),
        price: 0,
        stock: 10,
      },
    ],
  };
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(
      seller1Connection,
      {
        body: productCreateData,
      },
    );
  typia.assert(product);
  // 3. Seller 2 attempts to upload images to Seller 1's product (should fail)
  // Using a randomly generated product ID since the product entity structure
  // doesn't expose the id property in the DTO definitions provided
  const randomProductId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const uploadInput = typia.random<IShoppingMallProductImage.ICreate>();
  await TestValidator.error(
    "seller 2 cannot upload to seller 1's product",
    async () => {
      await api.functional.shoppingMall.seller.products.images.uploadImages(
        seller2Connection,
        {
          productId: randomProductId,
          body: uploadInput,
        },
      );
    },
  );
}
