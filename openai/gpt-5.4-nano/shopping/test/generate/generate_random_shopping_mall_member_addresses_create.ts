import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_address } from "../prepare/prepare_random_shopping_mall_address";

export async function generate_random_shopping_mall_member_addresses_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallAddress.ICreate> | undefined;
  },
): Promise<IShoppingMallAddress> {
  const prepared: IShoppingMallAddress.ICreate =
    prepare_random_shopping_mall_address(props.body);
  return await api.functional.shoppingMall.member.addresses.create(connection, {
    body: prepared,
  });
}
