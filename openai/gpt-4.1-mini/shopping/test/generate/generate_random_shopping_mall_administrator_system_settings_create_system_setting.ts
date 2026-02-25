import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_system_setting } from "../prepare/prepare_random_shopping_mall_system_setting";

export async function generate_random_shopping_mall_administrator_system_settings_create_system_setting(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallSystemSetting.ICreate> | undefined;
  },
): Promise<IShoppingMallSystemSetting> {
  const prepared: IShoppingMallSystemSetting.ICreate =
    prepare_random_shopping_mall_system_setting(props.body);
  const result: IShoppingMallSystemSetting =
    await api.functional.shoppingMall.administrator.systemSettings.createSystemSetting(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
