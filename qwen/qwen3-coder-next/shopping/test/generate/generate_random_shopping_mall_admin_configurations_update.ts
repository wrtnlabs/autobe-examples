import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfiguration";
import type { IShoppingMallSystemConfigurationValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfigurationValue";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_system_configuration_value } from "../prepare/prepare_random_shopping_mall_system_configuration_value";

export async function generate_random_shopping_mall_admin_configurations_update(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallSystemConfigurationValue.ICreate>;
    params?: {
      configurationId: string;
    };
  },
): Promise<IShoppingMallSystemConfigurationValue> {
  const prepared: IShoppingMallSystemConfigurationValue.ICreate =
    prepare_random_shopping_mall_system_configuration_value(props.body);
  const result: IShoppingMallSystemConfigurationValue =
    await api.functional.shoppingMall.admin.configurations.update(connection, {
      configurationId:
        props.params?.configurationId ??
        props.body?.configuration_id ??
        typia.random<string & tags.Format<"uuid">>(),
      body: prepared,
    });
  return result;
}
