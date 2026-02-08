import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSaleUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleUnit";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_sale_unit } from "../prepare/prepare_random_shopping_mall_sale_unit";

export async function generate_random_shopping_mall_seller_sale_units_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallSaleUnit.ICreate> | undefined;
  },
): Promise<IShoppingMallSaleUnit> {
  const prepared: IShoppingMallSaleUnit.ICreate =
    prepare_random_shopping_mall_sale_unit(props.body);
  const result: IShoppingMallSaleUnit =
    await api.functional.shoppingMall.seller.sale_units.create(connection, {
      body: prepared,
    });
  return result;
}
