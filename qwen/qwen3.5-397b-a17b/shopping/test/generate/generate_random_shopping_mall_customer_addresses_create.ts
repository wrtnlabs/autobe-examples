import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_address } from "../prepare/prepare_random_shopping_mall_address";

export async function generate_random_shopping_mall_customer_addresses_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallAddress.ICreate>;
  },
): Promise<IShoppingMallAddress> {
  const prepared: IShoppingMallAddress.ICreate =
    prepare_random_shopping_mall_address(props.body);
  const result: IShoppingMallAddress =
    await api.functional.shoppingMall.customer.addresses.create(connection, {
      body: prepared,
    });
  return result;
}
