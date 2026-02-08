import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_sale } from "../prepare/prepare_random_shopping_mall_sale";

export async function generate_random_shopping_mall_seller_sales_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallSale.ICreate> | undefined;
  },
): Promise<IShoppingMallSale> {
  const prepared: IShoppingMallSale.ICreate = prepare_random_shopping_mall_sale(
    props.body,
  );
  const result: IShoppingMallSale =
    await api.functional.shoppingMall.seller.sales.create(connection, {
      body: prepared,
    });
  return result;
}
