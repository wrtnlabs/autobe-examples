import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
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
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

export async function test_api_product_update_forbidden_by_non_owner_seller(
  connection: api.IConnection,
): Promise<void> {
  // Register first seller (owner) and authenticate
  const firstSellerConnection: api.IConnection = { host: connection.host };
  const firstSeller = await authorize_seller_join(firstSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      shopName: "OwnerShop",
      shopDescription: null,
      logoUri: null,
    },
  });
  firstSellerConnection.headers = {
    Authorization: `Bearer ${firstSeller.token.access}`,
  };
  // Create a product as the first seller
  const createdProduct =
    await generate_random_shopping_mall_seller_products_create(
      firstSellerConnection,
      { body: {} },
    );
  typia.assert(createdProduct);
  // Register second seller and authenticate
  const secondSellerConnection: api.IConnection = { host: connection.host };
  const secondSeller = await authorize_seller_join(secondSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      shopName: "IntruderShop",
      shopDescription: null,
      logoUri: null,
    },
  });
  secondSellerConnection.headers = {
    Authorization: `Bearer ${secondSeller.token.access}`,
  };
  // Attempt to update the product as the second (non-owner) seller
  const updateBody: IShoppingMallProduct.IUpdate = {
    name: "UpdatedNameByNonOwner",
    description: "Attempting unauthorized product update",
    basePrice: createdProduct.basePrice + 1000,
  };
  // Expect 403 Forbidden error
  await TestValidator.httpError(
    "update by non-owner seller should be forbidden",
    403,
    async () => {
      await api.functional.shoppingMall.seller.products.update(
        secondSellerConnection,
        {
          productId: createdProduct.id,
          body: updateBody,
        },
      );
    },
  );
}
