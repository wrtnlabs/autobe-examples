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

export async function test_api_seller_sales_promotions_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins and gets authorized connection.
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorizedSeller = await authorize_seller_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "StrongP@ssw0rd",
      shopName: RandomGenerator.name(2),
      shopDescription: RandomGenerator.paragraph({ sentences: 2 }),
      logoUri: null,
    },
  });
  sellerConnection.headers = { Authorization: authorizedSeller.token.access };
  // 2. Seller creates a new sale.
  const newSale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    {
      body: {
        name: "Test Sale",
        description: "Test Description",
        base_price: 10000,
      },
    },
  );
  typia.assert(newSale);
  // 3. Seller creates a new promotion linked to the sale.
  const newPromotion =
    await generate_random_shopping_mall_seller_sales_promotions_create_promotion(
      sellerConnection,
      {
        params: { saleId: newSale.id },
        body: {
          promotionCode: "PROMO2026",
          promotionType: "percentage",
          description: "Initial promotion description",
          discountValue: 10,
          discountType: "percentage",
          startAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
          endAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
          active: true,
        },
      },
    );
  typia.assert(newPromotion);
  // 4. Scenario 1: Successfully update the existing promotion.
  const updatedPromotionBody: IShoppingMallSalePromotion.IUpdate = {
    promotion_code: "UPDATED_PROMO_CODE",
    promotion_type: "fixed amount",
    description: "Updated promotion description",
    discount_value: 500,
    discount_type: "fixed amount",
    start_at: new Date(Date.now() + 1000 * 60 * 120).toISOString(), // 2 hours later
    end_at: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(), // 2 days later
    active: false,
  };
  const updatedPromotion =
    await api.functional.shoppingMall.seller.sales.promotions.update(
      sellerConnection,
      {
        saleId: newSale.id,
        promotionId: newPromotion.id,
        body: updatedPromotionBody,
      },
    );
  typia.assert(updatedPromotion);
  TestValidator.equals(
    "updated saleId matches",
    updatedPromotion.shoppingMallSaleId,
    newSale.id,
  );
  TestValidator.equals(
    "updated promotion Id matches",
    updatedPromotion.id,
    newPromotion.id,
  );
  TestValidator.predicate(
    "discount value non-negative",
    updatedPromotion.discountValue >= 0,
  );
  TestValidator.predicate(
    "discount type valid",
    updatedPromotion.discountType === "percentage" ||
      updatedPromotion.discountType === "fixed amount",
  );
  TestValidator.equals(
    "promotion code updated correctly",
    updatedPromotion.promotionCode,
    updatedPromotionBody.promotion_code,
  );
  TestValidator.equals(
    "promotion type updated correctly",
    updatedPromotion.promotionType,
    updatedPromotionBody.promotion_type,
  );
  TestValidator.equals(
    "promotion description updated correctly",
    updatedPromotion.description,
    updatedPromotionBody.description,
  );
  TestValidator.equals(
    "promotion active status updated correctly",
    updatedPromotion.active,
    updatedPromotionBody.active,
  );
  TestValidator.predicate(
    "updatedAt is refreshed",
    new Date(updatedPromotion.updatedAt).getTime() >=
      new Date(newPromotion.updatedAt).getTime(),
  );
  // 5. Scenario 2: Attempt to update with invalid UUIDs for saleId or promotionId.
  const invalidIds = ["invalid-uuid", "1234-5678", "not-a-uuid"];
  await TestValidator.error("invalid saleId format", async () => {
    await api.functional.shoppingMall.seller.sales.promotions.update(
      sellerConnection,
      {
        saleId: invalidIds[0] as any,
        promotionId: newPromotion.id,
        body: updatedPromotionBody,
      },
    );
  });
  await TestValidator.error("invalid promotionId format", async () => {
    await api.functional.shoppingMall.seller.sales.promotions.update(
      sellerConnection,
      {
        saleId: newSale.id,
        promotionId: invalidIds[1] as any,
        body: updatedPromotionBody,
      },
    );
  });
  // 6. Scenario 3: Attempt to update promotion not belonging to given saleId
  const anotherSale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    {
      body: {
        name: "Another Sale",
        description: "Other Description",
        base_price: 5000,
      },
    },
  );
  typia.assert(anotherSale);
  // Create another promotion linked to anotherSale
  const anotherPromotion =
    await generate_random_shopping_mall_seller_sales_promotions_create_promotion(
      sellerConnection,
      {
        params: { saleId: anotherSale.id },
        body: {
          promotionCode: "OTHER_PROMO",
          promotionType: "percentage",
          description: "Another promotion",
          discountValue: 15,
          discountType: "percentage",
          startAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
          endAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
          active: true,
        },
      },
    );
  typia.assert(anotherPromotion);
  // Attempt update with mismatched saleId and promotionId
  await TestValidator.error(
    "mismatched saleId and promotionId update",
    async () => {
      await api.functional.shoppingMall.seller.sales.promotions.update(
        sellerConnection,
        {
          saleId: newSale.id,
          promotionId: anotherPromotion.id,
          body: updatedPromotionBody,
        },
      );
    },
  );
}
