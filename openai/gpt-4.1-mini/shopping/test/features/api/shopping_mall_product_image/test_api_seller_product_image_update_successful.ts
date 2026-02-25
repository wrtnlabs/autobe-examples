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

export async function test_api_seller_product_image_update_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins and gets authorized
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "StrongPass123!",
      shopName: RandomGenerator.name(1),
      shopDescription: null,
      logoUri: null,
    },
  });
  typia.assert(seller);
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = { Authorization: seller.token.access };
  // 2. Create product for seller
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(product);
  // 3. Create product image for product
  const productImage =
    await generate_random_shopping_mall_seller_products_images_create_image(
      sellerConnection,
      { params: { productId: product.id }, body: {} },
    );
  typia.assert(productImage);
  // 4. Prepare update body with new imageUrl and displayOrder
  const updateBody: IShoppingMallProductImage.IUpdate = {
    imageUrl: `https://updated.example.com/images/${RandomGenerator.alphabets(10)}.jpg`,
    displayOrder: (productImage.displayOrder ?? 1) + 1,
  };
  // 5. Update product image
  const updatedImage =
    await api.functional.shoppingMall.seller.products.images.updateProductImage(
      sellerConnection,
      {
        productId: product.id,
        imageId: productImage.id,
        body: updateBody,
      },
    );
  typia.assert(updatedImage);
  // 6. Validate the update fields
  TestValidator.equals("product image id", updatedImage.id, productImage.id);
  TestValidator.equals(
    "product id association",
    updatedImage.shoppingMallProductId,
    product.id,
  );
  TestValidator.equals(
    "imageUrl updated",
    updatedImage.imageUrl,
    updateBody.imageUrl,
  );
  TestValidator.equals(
    "displayOrder updated",
    updatedImage.displayOrder,
    updateBody.displayOrder,
  );
  // 7. Validate timestamps are proper ISO strings and updatedAt is newer than createdAt
  TestValidator.predicate(
    "createdAt is ISO date string",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]{8,}Z$/.test(updatedImage.createdAt),
  );
  TestValidator.predicate(
    "updatedAt is ISO date string",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]{8,}Z$/.test(updatedImage.updatedAt),
  );
  TestValidator.predicate(
    "updatedAt is later than or equal to createdAt",
    updatedImage.updatedAt >= updatedImage.createdAt,
  );
  // 8. DeletedAt should be null (not soft deleted)
  TestValidator.equals("deletedAt is null", updatedImage.deletedAt, null);
}
