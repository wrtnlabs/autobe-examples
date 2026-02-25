import { IEcommerceCacheConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_cache_configuration(
  input?: DeepPartial<IEcommerceCacheConfiguration.ICreate> | undefined,
): IEcommerceCacheConfiguration.ICreate {
  return {
    cache_key:
      input?.cache_key ??
      `cache.${RandomGenerator.name(1)}.${RandomGenerator.name(1)}`,
    cache_type:
      input?.cache_type ??
      RandomGenerator.pick([
        "redis",
        "memory",
        "file",
        "database",
        "distributed",
      ] as const),
    configuration_value:
      input?.configuration_value ??
      JSON.stringify({
        ttl: typia.random<number & tags.Type<"uint32">>(),
        maxSize: typia.random<number & tags.Type<"uint32">>(),
        compression: RandomGenerator.pick([true, false] as const),
        cleanupInterval: typia.random<number & tags.Type<"uint32">>(),
      }),
    description:
      input?.description ??
      (RandomGenerator.pick([true, false] as const)
        ? RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 2,
            sentenceMax: 5,
          })
        : null),
    is_active: input?.is_active ?? RandomGenerator.pick([true, false] as const),
    priority:
      input?.priority ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
      >(),
  };
}
