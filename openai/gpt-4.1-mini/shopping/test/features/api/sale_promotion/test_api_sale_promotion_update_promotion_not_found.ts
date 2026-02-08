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

export async function test_api_sale_promotion_update_promotion_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Test updating a sale promotion by an authorized seller when the promotion ID does not exist.
  // The scenario starts with seller registration, sale creation, and promotion creation
  // to have valid promotional context.
  // Then attempt to update a promotion using a non-existent UUID as promotionId.
  // Ensure API returns appropriate error response indicating the promotion was not found,
  // validating error handling for nonexistent promotion updates.
  // 1. Seller joins (register)
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorizedSeller = await authorize_seller_join(sellerConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(authorizedSeller);
  sellerConnection.headers = { Authorization: authorizedSeller.token.access };
  // 2. Seller creates a sale needed for promotion
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    {},
  );
  typia.assert(sale);
  const saleAsEntity = sale as IEntity & IShoppingMallSale;
  // 3. Seller creates a promotion for that sale
  const promotion =
    await generate_random_shopping_mall_seller_sale_promotions_create(
      sellerConnection,
      {
        body: {
          promotion_code: RandomGenerator.alphabets(8), // minimal code for unique promotion code
          shoppingMallSaleId: saleAsEntity.id,
          promotion_type: "percentage",
          description: RandomGenerator.paragraph({ sentences: 1 }),
          discount_value: 10,
          discount_type: "percent",
          start_at: new Date().toISOString(),
          end_at: new Date(Date.now() + 86400000).toISOString(),
          active: true,
        } satisfies IShoppingMallSalePromotion.ICreate,
      },
    );
  typia.assert(promotion);
  // 4. Attempt to update a promotion with a non-existent promotionId
  const nonExistentPromotionId = typia.random<string & tags.Format<"uuid">>();
  // Prepare update body (random update data)
  const updateBody = typia.random<IShoppingMallSalePromotion.IUpdate>();
  // 5. Expect error when updating non-existent promotion
  await TestValidator.error(
    "update non-existent promotion should fail",
    async () => {
      await api.functional.shoppingMall.seller.sale_promotions.update(
        sellerConnection,
        {
          promotionId: nonExistentPromotionId,
          body: updateBody,
        },
      );
    },
  );
}
