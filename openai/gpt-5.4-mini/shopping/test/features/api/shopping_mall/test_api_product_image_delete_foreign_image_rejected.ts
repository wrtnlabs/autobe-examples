import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_images_create } from "../../../generate/generate_random_shopping_mall_seller_products_images_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";

export async function test_api_product_image_delete_foreign_image_rejected(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@test.com` satisfies string,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  const targetProduct =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          base_price: 1000,
        },
      },
    );
  typia.assert(targetProduct);
  const targetImage =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: targetProduct.id },
        body: {
          imageUri:
            `https://example.com/${RandomGenerator.alphaNumeric(10)}.jpg` satisfies string,
          displayOrder: 0,
          altText: RandomGenerator.name(),
        } satisfies IShoppingMallProductImage.ICreate,
      },
    );
  typia.assert(targetImage);
  const foreignProduct =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          base_price: 2000,
        },
      },
    );
  typia.assert(foreignProduct);
  const foreignImage =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: foreignProduct.id },
        body: {
          imageUri:
            `https://example.com/${RandomGenerator.alphaNumeric(10)}.jpg` satisfies string,
          displayOrder: 0,
          altText: RandomGenerator.name(),
        } satisfies IShoppingMallProductImage.ICreate,
      },
    );
  typia.assert(foreignImage);
  const beforeIds = targetProduct.images.map((image) => image.id);
  const beforeOrders = targetProduct.images.map((image) => image.displayOrder);
  const beforeUris = targetProduct.images.map((image) => image.imageUri);
  await TestValidator.httpError(
    "foreign image deletion should be rejected",
    [400, 403, 404],
    async () => {
      await api.functional.shoppingMall.seller.products.images.erase(
        sellerConnection,
        {
          productId: targetProduct.id,
          imageId: foreignImage.id,
        },
      );
    },
  );
  TestValidator.equals(
    "target product image ids remain unchanged",
    targetProduct.images.map((image) => image.id),
    beforeIds,
  );
  TestValidator.equals(
    "target product image orders remain unchanged",
    targetProduct.images.map((image) => image.displayOrder),
    beforeOrders,
  );
  TestValidator.equals(
    "target product image uris remain unchanged",
    targetProduct.images.map((image) => image.imageUri),
    beforeUris,
  );
}
