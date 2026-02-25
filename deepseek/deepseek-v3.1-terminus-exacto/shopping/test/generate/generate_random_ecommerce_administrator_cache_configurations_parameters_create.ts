import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCacheConfigurationParameterDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationParameterDefinition";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_cache_configuration_parameter_definition } from "../prepare/prepare_random_ecommerce_cache_configuration_parameter_definition";

export async function generate_random_ecommerce_administrator_cache_configurations_parameters_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceCacheConfigurationParameterDefinition.ICreate>;
    params: {
      configId: string;
    };
  },
): Promise<IEcommerceCacheConfigurationParameterDefinition> {
  const prepared: IEcommerceCacheConfigurationParameterDefinition.ICreate =
    prepare_random_ecommerce_cache_configuration_parameter_definition(
      props.body,
    );
  const result: IEcommerceCacheConfigurationParameterDefinition =
    await api.functional.ecommerce.administrator.cache_configurations.parameters.create(
      connection,
      {
        configId: props.params.configId,
        body: prepared,
      },
    );
  return result;
}
