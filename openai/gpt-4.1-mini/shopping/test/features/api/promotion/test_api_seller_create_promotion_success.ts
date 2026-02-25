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

export async function test_api_seller_create_promotion_success(
  connection: api.IConnection,
): Promise<void> {
  // Seller join and authorize
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorizedSeller = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  sellerConnection.headers = { Authorization: authorizedSeller.token.access };
  // Create sale
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(sale);
  // Prepare promotion create data
  const promotionCreateBody: IShoppingMallSalePromotion.ICreate = {
    promotionCode: `PROMO-${RandomGenerator.alphabets(6).toUpperCase()}`,
    promotionType: "percentage",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    discountValue: 15, // 15 percent discount
    discountType: "percentage",
    startAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // started 1 hour ago
    endAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(), // ends in 7 days
    active: true,
  };
  // Create promotion linked to the sale
  const promotion =
    await generate_random_shopping_mall_seller_sales_promotions_create_promotion(
      sellerConnection,
      {
        params: { saleId: sale.id },
        body: promotionCreateBody,
      },
    );
  // Assert type correctness of response
  typia.assert(promotion);
  // Validate linkage and fields
  TestValidator.equals(
    "promotion linked sale id",
    promotion.shoppingMallSaleId,
    sale.id,
  );
  TestValidator.equals(
    "promotion code matches",
    promotion.promotionCode,
    promotionCreateBody.promotionCode,
  );
  TestValidator.equals(
    "promotion type matches",
    promotion.promotionType,
    promotionCreateBody.promotionType,
  );
  TestValidator.equals(
    "description matches",
    promotion.description,
    promotionCreateBody.description,
  );
  TestValidator.equals(
    "discount value matches",
    promotion.discountValue,
    promotionCreateBody.discountValue,
  );
  TestValidator.equals(
    "discount type matches",
    promotion.discountType,
    promotionCreateBody.discountType,
  );
  TestValidator.equals(
    "active status matches",
    promotion.active,
    promotionCreateBody.active,
  );
  // Date fields: compare as string equality
  TestValidator.equals(
    "startAt matches",
    promotion.startAt,
    promotionCreateBody.startAt,
  );
  TestValidator.equals(
    "endAt matches",
    promotion.endAt,
    promotionCreateBody.endAt,
  );
  // The sale summary inside promotion should match created sale summary
  TestValidator.equals("promotion sale id matches", promotion.sale.id, sale.id);
  TestValidator.equals(
    "promotion sale name matches",
    promotion.sale.name,
    sale.name,
  );
  TestValidator.equals(
    "promotion sale basePrice matches",
    promotion.sale.basePrice,
    sale.basePrice,
  );
  TestValidator.equals(
    "promotion sale status matches",
    promotion.sale.status,
    sale.status,
  );
}
