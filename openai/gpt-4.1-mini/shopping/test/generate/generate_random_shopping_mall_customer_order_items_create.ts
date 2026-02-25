import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_order_item } from "../prepare/prepare_random_shopping_mall_order_item";

export async function generate_random_shopping_mall_customer_order_items_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallOrderItem.ICreate>;
  },
): Promise<IShoppingMallOrderItem> {
  const prepared: IShoppingMallOrderItem.ICreate =
    prepare_random_shopping_mall_order_item(props.body);
  const result: IShoppingMallOrderItem =
    await api.functional.shoppingMall.customer.order_items.create(connection, {
      body: prepared,
    });
  return result;
}
