import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfiguration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_system_configuration } from "../prepare/prepare_random_shopping_mall_system_configuration";

export async function generate_random_shopping_mall_admin_configurations_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallSystemConfiguration.ICreate> | undefined;
  },
): Promise<IShoppingMallSystemConfiguration> {
  const prepared: IShoppingMallSystemConfiguration.ICreate =
    prepare_random_shopping_mall_system_configuration(props.body);
  return await api.functional.shoppingMall.admin.configurations.create(
    connection,
    {
      body: prepared,
    },
  );
}
