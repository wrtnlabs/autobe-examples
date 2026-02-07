import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSystematicConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystematicConfig";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_systematic_config } from "../prepare/prepare_random_shopping_mall_systematic_config";

export async function generate_random_shopping_mall_admin_configs_configure(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallSystematicConfig.ICreate> | undefined;
  },
): Promise<IShoppingMallSystematicConfig> {
  const prepared: IShoppingMallSystematicConfig.ICreate =
    prepare_random_shopping_mall_systematic_config(props.body);
  return await api.functional.shoppingMall.admin.configs.configure(connection, {
    body: prepared,
  });
}
