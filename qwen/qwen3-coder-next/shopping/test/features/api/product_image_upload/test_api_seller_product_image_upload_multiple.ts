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

export async function test_api_seller_product_image_upload_multiple(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: RandomGenerator.name(3),
      shopDescription: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 2. Create product before uploading images
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: typia.random<IShoppingMallProduct.ICreate>(),
    },
  );
  typia.assert(product);
  // 3. Upload product images (empty body as per ICreate definition)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const productId = (product as any).id;
  const uploadedImages =
    await api.functional.shoppingMall.seller.products.images.uploadImages(
      sellerConnection,
      {
        productId,
        body: {}, // IShoppingMallProductImage.ICreate is an empty type
      },
    );
  typia.assert(uploadedImages);
  // 4. Validate response structure
  TestValidator.predicate("response is array", Array.isArray(uploadedImages));
}