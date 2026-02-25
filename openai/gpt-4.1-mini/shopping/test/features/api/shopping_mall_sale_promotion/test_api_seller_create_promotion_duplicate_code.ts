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
import { generate_random_shopping_mall_seller_sales_promotions_create_promotion } from "../../../generate/generate_random_shopping_mall_seller_sales_promotions_create_promotion";
import { prepare_random_shopping_mall_sale } from "../../../prepare/prepare_random_shopping_mall_sale";
import { prepare_random_shopping_mall_sale_promotion } from "../../../prepare/prepare_random_shopping_mall_sale_promotion";

export async function test_api_seller_create_promotion_duplicate_code(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller join and auth
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      shopName: "Test Shop",
      shopDescription: "Test shop description",
      logoUri: null,
    },
  });
  typia.assert(sellerAuthorized);
  sellerConnection.headers = {
    Authorization: sellerAuthorized.token.access,
  };
  // 2. Create a sale
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    {
      body: {
        name: "Test Sale",
        category_id: typia.random<string & tags.Format<"uuid">>(),
        description: "Test sale description",
        base_price: 1000,
      },
    },
  );
  typia.assert(sale);
  // 3. Create first promotion with a specific promotion code and date range
  const promotionCode = "PROMO12345";
  const now = new Date();
  const startAt1 = new Date(now.getTime() + 1000 * 60 * 60).toISOString(); // 1 hour later
  const endAt1 = new Date(now.getTime() + 1000 * 60 * 60 * 24).toISOString(); // 1 day later
  const promotion1 =
    await generate_random_shopping_mall_seller_sales_promotions_create_promotion(
      sellerConnection,
      {
        params: { saleId: sale.id },
        body: {
          promotionCode: promotionCode,
          promotionType: "percentage",
          description: "First promotion",
          discountValue: 10.0,
          discountType: "percentage",
          startAt: startAt1,
          endAt: endAt1,
          active: true,
        },
      },
    );
  typia.assert(promotion1);
  // 4. Attempt duplicate promotion code creation for same sale - expect error
  await TestValidator.error("duplicate promotion code", async () => {
    await generate_random_shopping_mall_seller_sales_promotions_create_promotion(
      sellerConnection,
      {
        params: { saleId: sale.id },
        body: {
          promotionCode: promotionCode, // duplicate code
          promotionType: "percentage",
          description: "Duplicate promotion",
          discountValue: 15.0,
          discountType: "percentage",
          startAt: new Date(now.getTime() + 1000 * 60 * 60 * 2).toISOString(), // 2 hours later
          endAt: new Date(now.getTime() + 1000 * 60 * 60 * 25).toISOString(), // 25 hours later
          active: true,
        },
      },
    );
  });
  // 5. Attempt overlapping date range with different promotion code - should succeed
  const promotion2Code = "PROMO67890";
  const startAt2 = new Date(now.getTime() + 1000 * 60 * 60 * 12).toISOString(); // 12 hours later (overlap with promotion1)
  const endAt2 = new Date(now.getTime() + 1000 * 60 * 60 * 36).toISOString(); // 36 hours later
  const promotion2 =
    await generate_random_shopping_mall_seller_sales_promotions_create_promotion(
      sellerConnection,
      {
        params: { saleId: sale.id },
        body: {
          promotionCode: promotion2Code,
          promotionType: "fixed",
          description: "Second promotion overlapping dates but different code",
          discountValue: 20.0,
          discountType: "fixed",
          startAt: startAt2,
          endAt: endAt2,
          active: true,
        },
      },
    );
  typia.assert(promotion2);
  // 6. Attempt same promotion code but non-overlapping dates - expect error (assuming unique code regardless of dates)
  const startAt3 = new Date(now.getTime() + 1000 * 60 * 60 * 48).toISOString(); // 48 hours later
  const endAt3 = new Date(now.getTime() + 1000 * 60 * 60 * 72).toISOString(); // 72 hours later
  await TestValidator.error(
    "duplicate promotion code on non-overlapping date",
    async () => {
      await generate_random_shopping_mall_seller_sales_promotions_create_promotion(
        sellerConnection,
        {
          params: { saleId: sale.id },
          body: {
            promotionCode: promotionCode, // same code
            promotionType: "percentage",
            description: "Third promotion with same code non-overlapping dates",
            discountValue: 25.0,
            discountType: "percentage",
            startAt: startAt3,
            endAt: endAt3,
            active: true,
          },
        },
      );
    },
  );
}
