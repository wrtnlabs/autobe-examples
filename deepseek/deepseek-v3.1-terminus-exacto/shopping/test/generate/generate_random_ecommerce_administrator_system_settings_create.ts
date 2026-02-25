import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSystemSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_system_setting } from "../prepare/prepare_random_ecommerce_system_setting";

export async function generate_random_ecommerce_administrator_system_settings_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceSystemSetting.ICreate>;
  },
): Promise<IEcommerceSystemSetting> {
  const prepared: IEcommerceSystemSetting.ICreate =
    prepare_random_ecommerce_system_setting(props.body);
  const result: IEcommerceSystemSetting =
    await api.functional.ecommerce.administrator.system_settings.create(
      connection,
      { body: prepared },
    );
  return result;
}
