import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCacheConfigurationParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationParameter";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_cache_configuration_parameter } from "../prepare/prepare_random_ecommerce_cache_configuration_parameter";

export async function generate_random_ecommerce_super_administrator_cache_configurations_parameters_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceCacheConfigurationParameter.ICreate>;
    params: {
      configId: string & tags.Format<"uuid">;
    };
  },
): Promise<IEcommerceCacheConfigurationParameter> {
  const prepared: IEcommerceCacheConfigurationParameter.ICreate =
    prepare_random_ecommerce_cache_configuration_parameter(props.body);
  const result: IEcommerceCacheConfigurationParameter =
    await api.functional.ecommerce.superAdministrator.cache_configurations.parameters.create(
      connection,
      {
        configId: props.params.configId,
        body: prepared,
      },
    );
  return result;
}
