import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSystemConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_system_configuration } from "../prepare/prepare_random_ecommerce_mall_system_configuration";

export async function generate_random_ecommerce_mall_admin_system_configurations_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallSystemConfiguration.ICreate> | undefined;
  },
): Promise<IEcommerceMallSystemConfiguration> {
  const prepared: IEcommerceMallSystemConfiguration.ICreate =
    prepare_random_ecommerce_mall_system_configuration(props.body);
  return await api.functional.ecommerceMall.admin.system_configurations.create(
    connection,
    {
      body: prepared,
    },
  );
}
