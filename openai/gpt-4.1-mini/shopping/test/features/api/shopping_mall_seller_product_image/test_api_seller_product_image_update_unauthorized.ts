import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSubcategory";
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
import { generate_random_shopping_mall_seller_products_images_create_image } from "../../../generate/generate_random_shopping_mall_seller_products_images_create_image";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";

export async function test_api_seller_product_image_update_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies that a seller cannot update a product image for a product they do not own.
  // 1. Register and authenticate Seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, { body: {} });
  // 2. Register and authenticate Seller B (the other seller who owns the product)
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, { body: {} });
  // 3. Seller B creates a product
  const productB = await generate_random_shopping_mall_seller_products_create(
    sellerBConnection,
    { body: {} },
  );
  typia.assert(productB);
  // 4. Seller B creates a product image for that product
  const productImageB =
    await generate_random_shopping_mall_seller_products_images_create_image(
      sellerBConnection,
      {
        params: { productId: productB.id },
        body: {},
      },
    );
  typia.assert(productImageB);
  // 5. Seller A attempts to update the product image of Seller B's product
  // Prepare update payload: new imageUrl and displayOrder
  const updateBody: IShoppingMallProductImage.IUpdate = {
    imageUrl: `https://example.com/updated-image-${RandomGenerator.alphaNumeric(8)}.jpg`,
    displayOrder: 1,
  };
  // 6. Try updating and expect HTTP 403 Forbidden
  await TestValidator.httpError(
    "unauthorized product image update attempt",
    403,
    async () => {
      await api.functional.shoppingMall.seller.products.images.updateProductImage(
        sellerAConnection,
        {
          productId: productB.id,
          imageId: productImageB.id,
          body: updateBody,
        },
      );
    },
  );
}
