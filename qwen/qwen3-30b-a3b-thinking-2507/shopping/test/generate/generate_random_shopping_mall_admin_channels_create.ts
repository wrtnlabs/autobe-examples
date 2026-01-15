import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import { prepare_random_shopping_mall_channel } from "../prepare/prepare_random_shopping_mall_channel";
export async function generate_random_shopping_mall_admin_channels_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallChannel.ICreate>;
  },
): Promise<IShoppingMallChannel> {
  const prepared = prepare_random_shopping_mall_channel(props.body);
  return await api.functional.shoppingMall.admin.channels.create(connection, {
    body: prepared,
  });
}
