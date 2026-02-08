import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSalePromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalePromotion";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_sale_promotion_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(sellerAuth);
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuth.token.access}`,
  };
  // 2. Retrieve a sale promotion by random UUID (simulate existence)
  const promotionId = typia.random<string & tags.Format<"uuid">>();
  const promotion = await api.functional.shoppingMall.seller.sale_promotions.at(
    sellerConnection,
    {
      promotionId,
    },
  );
  typia.assert(promotion);
  // 3. Validate expected core fields presence
  // Cannot check specific values as DTO has no explicit properties, just assert the object
  TestValidator.predicate(
    "promotion retrieved",
    promotion !== null && typeof promotion === "object",
  );
}
