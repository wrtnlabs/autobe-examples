import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_shipping_address } from "../prepare/prepare_random_shopping_mall_shipping_address";

export async function generate_random_shopping_mall_customer_shipping_addresses_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallShippingAddress.ICreate> | undefined;
  },
): Promise<IShoppingMallShippingAddress> {
  const prepared: IShoppingMallShippingAddress.ICreate =
    prepare_random_shopping_mall_shipping_address(props.body);
  const result: IShoppingMallShippingAddress =
    await api.functional.shoppingMall.customer.shippingAddresses.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
