import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
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
import { generate_random_shopping_mall_seller_sale_promotions_create } from "../../../generate/generate_random_shopping_mall_seller_sale_promotions_create";
import { generate_random_shopping_mall_seller_sales_create } from "../../../generate/generate_random_shopping_mall_seller_sales_create";
import { prepare_random_shopping_mall_sale } from "../../../prepare/prepare_random_shopping_mall_sale";
import { prepare_random_shopping_mall_sale_promotion } from "../../../prepare/prepare_random_shopping_mall_sale_promotion";

export async function test_api_sale_promotion_deletion_success_and_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful deletion
  // Authenticate seller via join operation
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(sellerAuth);
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuth.token.access}`,
  };
  // Create a new sale
  const rawSale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    {
      body: {},
    },
  );
  // Cast to any to extract id with assert
  const sale = rawSale as any;
  typia.assert(sale.id as string & tags.Format<"uuid">);
  // Create a sale promotion linked to the sale
  const rawPromotion =
    await generate_random_shopping_mall_seller_sale_promotions_create(
      sellerConnection,
      {
        body: { shoppingMallSaleId: sale.id },
      },
    );
  const promotion = rawPromotion as any;
  typia.assert(promotion.id as string & tags.Format<"uuid">);
  // Delete the sale promotion
  await api.functional.shoppingMall.seller.sale_promotions.erase(
    sellerConnection,
    {
      promotionId: promotion.id,
    },
  );
  // Attempt delete again should fail with 404
  await TestValidator.httpError(
    "delete non-existent promotion",
    404,
    async () => {
      await api.functional.shoppingMall.seller.sale_promotions.erase(
        sellerConnection,
        {
          promotionId: promotion.id,
        },
      );
    },
  );
  // Scenario 2: Delete non-existent promotion
  const sellerConnection2: api.IConnection = { host: connection.host };
  const sellerAuth2 = await authorize_seller_join(sellerConnection2, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(sellerAuth2);
  sellerConnection2.headers = {
    Authorization: `Bearer ${sellerAuth2.token.access}`,
  };
  await TestValidator.httpError(
    "delete random non-existent promotion",
    404,
    async () => {
      await api.functional.shoppingMall.seller.sale_promotions.erase(
        sellerConnection2,
        {
          promotionId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // Scenario 3: Delete without authentication
  const unauthConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "delete without authentication",
    401,
    async () => {
      await api.functional.shoppingMall.seller.sale_promotions.erase(
        unauthConnection,
        {
          promotionId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
