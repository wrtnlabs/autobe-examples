import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCartSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartSession";
import { prepare_random_shopping_mall_cart_session } from "../prepare/prepare_random_shopping_mall_cart_session";
export async function generate_random_shopping_mall_cart_sessions_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallCartSession.ICreate> | undefined;
  },
): Promise<IShoppingMallCartSession> {
  const prepared: IShoppingMallCartSession.ICreate =
    prepare_random_shopping_mall_cart_session(props.body);
  return await api.functional.shoppingMall.cart_sessions.create(connection, {
    body: prepared,
  });
}
