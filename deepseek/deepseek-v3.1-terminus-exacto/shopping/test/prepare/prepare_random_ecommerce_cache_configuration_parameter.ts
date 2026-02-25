import { IEcommerceCacheConfigurationParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationParameter";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_cache_configuration_parameter(
  input?: DeepPartial<IEcommerceCacheConfigurationParameter.ICreate>,
): IEcommerceCacheConfigurationParameter.ICreate {
  return {
    ecommerce_cache_configuration_parameter_definition_id:
      input?.ecommerce_cache_configuration_parameter_definition_id ??
      typia.random<string & tags.Format<"uuid">>(),
    parameter_value:
      input?.parameter_value ?? RandomGenerator.paragraph({ sentences: 2 }),
  };
}
