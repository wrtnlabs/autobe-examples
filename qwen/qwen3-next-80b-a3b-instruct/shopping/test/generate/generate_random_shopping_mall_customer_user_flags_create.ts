import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallUserFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserFlag";
import { prepare_random_shopping_mall_user_flag } from "../prepare/prepare_random_shopping_mall_user_flag";
export async function generate_random_shopping_mall_customer_user_flags_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallUserFlag.ICreate>;
  },
): Promise<IShoppingMallUserFlag> {
  const prepared: IShoppingMallUserFlag.ICreate =
    prepare_random_shopping_mall_user_flag(props.body);
  const result: IShoppingMallUserFlag =
    await api.functional.shoppingMall.customer.user.flags.create(connection, {
      body: prepared,
    });
  return result;
}
