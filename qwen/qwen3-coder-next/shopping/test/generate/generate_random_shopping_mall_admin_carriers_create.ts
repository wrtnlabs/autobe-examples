import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallShippingCarrier } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingCarrier";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_shipping_carrier } from "../prepare/prepare_random_shopping_mall_shipping_carrier";

export async function generate_random_shopping_mall_admin_carriers_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallShippingCarrier.ICreate> | undefined;
  },
): Promise<IShoppingMallShippingCarrier> {
  const prepared: IShoppingMallShippingCarrier.ICreate =
    prepare_random_shopping_mall_shipping_carrier(props.body);
  return await api.functional.shoppingMall.admin.carriers.create(connection, {
    body: prepared,
  });
}
