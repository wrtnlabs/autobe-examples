import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCarrier } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCarrier";
import { prepare_random_shopping_mall_carrier } from "../prepare/prepare_random_shopping_mall_carrier";
export async function generate_random_shopping_mall_admin_carriers_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallCarrier.ICreate>;
  },
): Promise<IShoppingMallCarrier> {
  const prepared: IShoppingMallCarrier.ICreate =
    prepare_random_shopping_mall_carrier(props.body);
  const result: IShoppingMallCarrier =
    await api.functional.shoppingMall.admin.carriers.create(connection, {
      body: prepared,
    });
  return result;
}
