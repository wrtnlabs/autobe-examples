import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformConfiguration";
import { prepare_random_shopping_mall_platform_configuration } from "../prepare/prepare_random_shopping_mall_platform_configuration";
export async function generate_random_shopping_mall_admin_platform_configurations_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallPlatformConfiguration.ICreate> | undefined;
  },
): Promise<IShoppingMallPlatformConfiguration> {
  const prepared: IShoppingMallPlatformConfiguration.ICreate =
    prepare_random_shopping_mall_platform_configuration(props.body);
  return await api.functional.shoppingMall.admin.platform.configurations.create(
    connection,
    {
      body: prepared,
    },
  );
}
