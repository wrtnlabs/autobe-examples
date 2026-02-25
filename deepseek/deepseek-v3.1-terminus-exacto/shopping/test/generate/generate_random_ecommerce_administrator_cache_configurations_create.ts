import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCacheConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_cache_configuration } from "../prepare/prepare_random_ecommerce_cache_configuration";

export async function generate_random_ecommerce_administrator_cache_configurations_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceCacheConfiguration.ICreate> | undefined;
  },
): Promise<IEcommerceCacheConfiguration> {
  const prepared: IEcommerceCacheConfiguration.ICreate =
    prepare_random_ecommerce_cache_configuration(props.body);
  const result: IEcommerceCacheConfiguration =
    await api.functional.ecommerce.administrator.cache_configurations.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
