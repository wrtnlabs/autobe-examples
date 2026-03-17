import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_customer_address } from "../prepare/prepare_random_shopping_mall_customer_address";

export async function generate_random_shopping_mall_customer_addresses_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallCustomerAddress.ICreate> | undefined;
  },
): Promise<IShoppingMallCustomerAddress> {
  const prepared: IShoppingMallCustomerAddress.ICreate =
    prepare_random_shopping_mall_customer_address(props.body);
  return await api.functional.shoppingMall.customer.addresses.create(
    connection,
    {
      body: prepared,
    },
  );
}
