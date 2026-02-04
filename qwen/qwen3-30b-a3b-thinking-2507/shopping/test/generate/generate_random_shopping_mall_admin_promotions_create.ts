import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSalesPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalesPromotion";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_sales_promotion } from "../prepare/prepare_random_shopping_mall_sales_promotion";

export async function generate_random_shopping_mall_admin_promotions_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallSalesPromotion.ICreate>;
  },
): Promise<IShoppingMallSalesPromotion> {
  const prepared: IShoppingMallSalesPromotion.ICreate =
    prepare_random_shopping_mall_sales_promotion(props.body);
  const result: IShoppingMallSalesPromotion =
    await api.functional.shoppingMall.admin.promotions.create(connection, {
      body: prepared,
    });
  return result;
}
