import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityBbsConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsConfiguration";
export function prepare_random_community_bbs_configuration(
  input?: DeepPartial<ICommunityBbsConfiguration.ICreate> | undefined,
): ICommunityBbsConfiguration.ICreate {
  return {
    key: input?.key ?? RandomGenerator.alphabets(10),
    value:
      input?.value ??
      JSON.stringify({
        enabled: RandomGenerator.pick([true, false] as const),
        threshold: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
        updatedAt: new Date().toISOString(),
      }),
    scope: RandomGenerator.pick([
      undefined,
      "global",
      "community-specific",
    ] as const),
  };
}
