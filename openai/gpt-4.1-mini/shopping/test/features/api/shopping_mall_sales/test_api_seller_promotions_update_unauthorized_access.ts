import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSubcategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
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

export async function test_api_seller_promotions_update_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as the original seller (owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_seller_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      shopName: "Owner Shop",
    },
  });
  ownerConnection.headers = {
    Authorization: `Bearer ${ownerAuth.token.access}`,
  };
  // 2. Authenticate as a different seller
  const otherConnection: api.IConnection = { host: connection.host };
  const otherAuth = await authorize_seller_join(otherConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      shopName: "Other Shop",
    },
  });
  otherConnection.headers = {
    Authorization: `Bearer ${otherAuth.token.access}`,
  };
  // 3. Prepare an unauthorized promotion update body
  const promotionUpdateBody: IShoppingMallSale.IPromotionUpdate = {
    discountPercentage: 20,
    active: false,
  };
  // 4. Attempt to update promotions by other seller with a random UUID `saleId`, expect 403 Forbidden
  const randomSaleId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "unauthorized seller cannot update promotions",
    403,
    async () => {
      await api.functional.shoppingMall.seller.sales.promotions.updatePromotions(
        otherConnection,
        {
          saleId: randomSaleId,
          body: promotionUpdateBody,
        },
      );
    },
  );
}
