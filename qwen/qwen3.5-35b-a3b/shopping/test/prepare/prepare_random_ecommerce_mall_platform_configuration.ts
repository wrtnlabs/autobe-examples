import { IEcommerceMallPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallPlatformConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_mall_platform_configuration(
  input?: DeepPartial<IEcommerceMallPlatformConfiguration.ICreate> | undefined,
): IEcommerceMallPlatformConfiguration.ICreate {
  return {
    configuration_key:
      input?.configuration_key ?? RandomGenerator.alphaNumeric(16),
    description:
      input?.description ??
      RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 }),
    configuration_type:
      input?.configuration_type ??
      RandomGenerator.pick(["string", "integer", "boolean", "json"] as const),
    scope:
      input?.scope ??
      RandomGenerator.pick(["global", "staging", "production"] as const),
    default_value: input?.default_value ?? typia.random<string>() ?? null,
    is_active: input?.is_active ?? typia.random<boolean>(),
  };
}
