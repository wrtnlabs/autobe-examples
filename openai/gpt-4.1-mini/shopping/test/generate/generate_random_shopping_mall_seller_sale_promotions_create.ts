import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSalePromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalePromotion";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_sale_promotion } from "../prepare/prepare_random_shopping_mall_sale_promotion";

export async function generate_random_shopping_mall_seller_sale_promotions_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallSalePromotion.ICreate> | undefined;
  },
): Promise<IShoppingMallSalePromotion> {
  const prepared: IShoppingMallSalePromotion.ICreate =
    prepare_random_shopping_mall_sale_promotion(props.body);
  const result: IShoppingMallSalePromotion =
    await api.functional.shoppingMall.seller.sale_promotions.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
