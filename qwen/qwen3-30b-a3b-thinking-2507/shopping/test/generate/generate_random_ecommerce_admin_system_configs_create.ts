import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSystemConfig";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_system_config } from "../prepare/prepare_random_ecommerce_system_config";

export async function generate_random_ecommerce_admin_system_configs_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceSystemConfig.ICreate> | undefined;
  },
): Promise<IEcommerceSystemConfig> {
  const prepared: IEcommerceSystemConfig.ICreate =
    prepare_random_ecommerce_system_config(props.body);
  return await api.functional.ecommerce.admin.system_configs.create(
    connection,
    {
      body: prepared,
    },
  );
}
