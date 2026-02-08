import api from "@ORGANIZATION/PROJECT-api";
import type { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { RandomGenerator, TestValidator } from "@nestia/e2e";
import typia from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { generate_random_shopping_mall_seller_sale_promotions_create } from "../../../generate/generate_random_shopping_mall_seller_sale_promotions_create";
import { generate_random_shopping_mall_seller_sales_create } from "../../../generate/generate_random_shopping_mall_seller_sales_create";

export async function test_api_sale_promotion_create(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful creation of a new sale promotion
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      // minimal required properties
    } satisfies IShoppingMallSeller.IJoin,
  });
  // Create a new sale to associate with promotion
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(sale);
  const saleEntity = sale as IEntity;

  // Create a new sale promotion with valid data
  const promotionCode = `PROMO-${RandomGenerator.alphaNumeric(6).toUpperCase()}`;
  const now = new Date();
  const startAt = now.toISOString();
  const endAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 1 week later
  const promotionRaw =
    await generate_random_shopping_mall_seller_sale_promotions_create(
      sellerConnection,
      {
        body: {
          shoppingMallSaleId: saleEntity.id,
          discountValue: 15, // 15% discount
          discountType: "percentage",
          active: true,
          promotionCode: promotionCode,
          startAt: startAt,
          endAt: endAt,
        },
      },
    );
  const promotion = promotionRaw as IEntity & {
    shoppingMallSaleId: string;
    discountValue: number;
    discountType: "percentage" | "fixed_amount";
    active: boolean;
    promotionCode: string;
    startAt: string;
    endAt: string;
  };
  typia.assert(promotion);

  TestValidator.equals(
    "promotion shoppingMallSaleId",
    promotion.shoppingMallSaleId,
    saleEntity.id,
  );
  TestValidator.equals(
    "promotion discountType",
    promotion.discountType,
    "percentage",
  );
  TestValidator.equals("promotion discountValue", promotion.discountValue, 15);
  TestValidator.equals("promotion active", promotion.active, true);
  TestValidator.equals(
    "promotion promotionCode",
    promotion.promotionCode,
    promotionCode,
  );
  TestValidator.equals("promotion startAt", promotion.startAt, startAt);
  TestValidator.equals("promotion endAt", promotion.endAt, endAt);

  // Scenario 2: Attempt to create sale promotion with duplicate promotion code
  await TestValidator.error("duplicate promotion code error", async () => {
    await generate_random_shopping_mall_seller_sale_promotions_create(
      sellerConnection,
      {
        body: {
          shoppingMallSaleId: saleEntity.id,
          discountValue: 10,
          discountType: "fixed_amount",
          active: true,
          promotionCode: promotionCode,
          startAt: startAt,
          endAt: endAt,
        },
      },
    );
  });

  // Scenario 3: Creation with boundary discount values and inactive flag
  const zeroDiscountPromotionRaw =
    await generate_random_shopping_mall_seller_sale_promotions_create(
      sellerConnection,
      {
        body: {
          shoppingMallSaleId: saleEntity.id,
          discountValue: 0,
          discountType: "percentage",
          active: true,
          promotionCode: `ZERO${RandomGenerator.alphaNumeric(4).toUpperCase()}`,
          startAt: startAt,
          endAt: endAt,
        },
      },
    );
  const zeroDiscountPromotion = zeroDiscountPromotionRaw as IEntity & {
    discountValue: number;
  };
  typia.assert(zeroDiscountPromotion);
  TestValidator.equals(
    "zero discount value",
    zeroDiscountPromotion.discountValue,
    0,
  );

  const highDiscountPromotionRaw =
    await generate_random_shopping_mall_seller_sale_promotions_create(
      sellerConnection,
      {
        body: {
          shoppingMallSaleId: saleEntity.id,
          discountValue: 1000,
          discountType: "percentage",
          active: false,
          promotionCode: `HIGH${RandomGenerator.alphaNumeric(4).toUpperCase()}`,
          startAt: startAt,
          endAt: endAt,
        },
      },
    );
  const highDiscountPromotion = highDiscountPromotionRaw as IEntity & {
    discountValue: number;
    active: boolean;
  };
  typia.assert(highDiscountPromotion);
  TestValidator.equals(
    "high discount value",
    highDiscountPromotion.discountValue,
    1000,
  );
  TestValidator.equals(
    "inactive promotion active flag",
    highDiscountPromotion.active,
    false,
  );
}
