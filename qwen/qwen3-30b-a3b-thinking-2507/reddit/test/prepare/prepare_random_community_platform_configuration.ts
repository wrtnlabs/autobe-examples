import { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_configuration(
  input?: DeepPartial<ICommunityPlatformConfiguration.ICreate> | undefined,
): ICommunityPlatformConfiguration.ICreate {
  return {
    type:
      input?.type ??
      typia.random<string & tags.MinLength<1> & tags.MaxLength<50>>(),
    value: input?.value ?? RandomGenerator.name(),
  };
}
