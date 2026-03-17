import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallPlatformConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_platform_configuration } from "../prepare/prepare_random_ecommerce_mall_platform_configuration";

export async function generate_random_ecommerce_mall_admin_platform_configurations_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallPlatformConfiguration.ICreate> | undefined;
  },
): Promise<IEcommerceMallPlatformConfiguration> {
  const prepared: IEcommerceMallPlatformConfiguration.ICreate =
    prepare_random_ecommerce_mall_platform_configuration(props.body);
  const result: IEcommerceMallPlatformConfiguration =
    await api.functional.ecommerceMall.admin.platform_configurations.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
