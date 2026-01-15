import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallConfigHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfigHistory";
import { prepare_random_shopping_mall_config_history } from "../prepare/prepare_random_shopping_mall_config_history";
export async function generate_random_shopping_mall_config_histories_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallConfigHistory.ICreate>;
  },
): Promise<IShoppingMallConfigHistory> {
  const prepared: IShoppingMallConfigHistory.ICreate =
    prepare_random_shopping_mall_config_history(props.body);
  const result: IShoppingMallConfigHistory =
    await api.functional.shoppingMall.config.histories.create(connection, {
      body: prepared,
    });
  return result;
}
