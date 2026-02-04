import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSalesPromoCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalesPromoCode";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_sales_promo_code } from "../prepare/prepare_random_shopping_mall_sales_promo_code";

export async function generate_random_shopping_mall_admin_promo_codes_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallSalesPromoCode.ICreate> | undefined;
  },
): Promise<IShoppingMallSalesPromoCode> {
  const prepared: IShoppingMallSalesPromoCode.ICreate =
    prepare_random_shopping_mall_sales_promo_code(props.body);
  return await api.functional.shoppingMall.admin.promo_codes.create(
    connection,
    {
      body: prepared,
    },
  );
}
