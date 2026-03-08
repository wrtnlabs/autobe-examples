import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_checkout } from "../prepare/prepare_random_shopping_mall_checkout";

export async function generate_random_shopping_mall_customer_checkout_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallCheckout.ICreate>;
  },
): Promise<IShoppingMallOrder> {
  const prepared: IShoppingMallCheckout.ICreate =
    prepare_random_shopping_mall_checkout(props.body);
  const result: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.checkout.create(connection, {
      body: prepared,
    });
  return result;
}
