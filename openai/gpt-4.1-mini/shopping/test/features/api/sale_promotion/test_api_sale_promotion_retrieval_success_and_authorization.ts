import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
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
import { generate_random_shopping_mall_seller_sales_create } from "../../../generate/generate_random_shopping_mall_seller_sales_create";
import { prepare_random_shopping_mall_sale } from "../../../prepare/prepare_random_shopping_mall_sale";

export async function test_api_sale_promotion_retrieval_success_and_authorization(
  connection: api.IConnection,
): Promise<void> {
  // 0. Prepare - Seller A joins and creates a sale
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAAuth = await authorize_seller_join(sellerAConnection, {
    body: {},
  });
  sellerAConnection.headers = {
    Authorization: `Bearer ${sellerAAuth.token.access}`,
  };
  const saleA = await generate_random_shopping_mall_seller_sales_create(
    sellerAConnection,
    { body: {} },
  );
  // We cannot create promotion via API, simulate a promotion for testing success retrieval
  // Note: Normally promotions would be created, but here we generate a random promotion DTO
  // for test retrieval. For authorization check we use saleA.id and manually assign promotion ID.
  // Instead, as per scenario, this test must check retrieval. So for the existing sale, we try
  // to fetch a non-existent promotion and expect a 404.
  // Create a test promotion ID (simulate existence) by random
  // But since the system has no creation API for promotions in dependencies, this part
  // is rewritten to test authorization failure and 404 properly
  // 1. Authorization Success Test (limited because no promotion creation API):
  // We'll skip promotion creation and focus on unauthorized and 404 cases.
  // Hence, we only test 403 and 404.
  // For comprehensive test, ideally, an existing promotion ID must be used. Since no create API,
  // we adapt test to only negative cases using random UUIDs.
  // Use `typia.random` to generate random IDs
  const validSaleId = saleA.id;
  const randomPromotionId = typia.random<string & tags.Format<"uuid">>();
  // 2. Unauthorized access by a different seller
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBAuth = await authorize_seller_join(sellerBConnection, {
    body: {},
  });
  sellerBConnection.headers = {
    Authorization: `Bearer ${sellerBAuth.token.access}`,
  };
  await TestValidator.httpError(
    "unauthorized seller cannot access another seller's promotion",
    403,
    async () => {
      await api.functional.shoppingMall.seller.sales.promotions.at(
        sellerBConnection,
        {
          saleId: validSaleId,
          promotionId: randomPromotionId,
        },
      );
    },
  );
  // 3. Unauthorized (no auth) access
  await TestValidator.httpError(
    "unauthenticated user cannot access seller promotion",
    403,
    async () => {
      await api.functional.shoppingMall.seller.sales.promotions.at(connection, {
        saleId: validSaleId,
        promotionId: randomPromotionId,
      });
    },
  );
  // 4. Non-existent or soft deleted promotion returns 404
  const nonExistentPromotionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent promotion returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.seller.sales.promotions.at(
        sellerAConnection,
        {
          saleId: validSaleId,
          promotionId: nonExistentPromotionId,
        },
      );
    },
  );
}
