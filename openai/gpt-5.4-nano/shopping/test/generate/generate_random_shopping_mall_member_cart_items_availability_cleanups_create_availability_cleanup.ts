import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_cart_item } from "../prepare/prepare_random_shopping_mall_cart_item";

export async function generate_random_shopping_mall_member_cart_items_availability_cleanups_create_availability_cleanup(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallCartItem.ICreate> | undefined;
  },
): Promise<void> {
  const prepared: IShoppingMallCartItem.ICreate =
    prepare_random_shopping_mall_cart_item(props.body);
  return await api.functional.shoppingMall.member.cart.items.availability.cleanups.createAvailabilityCleanup(
    connection,
    {
      body: prepared,
    },
  );
}
