import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFlag";
export function prepare_random_community_platform_flag(
  input?: DeepPartial<ICommunityPlatformFlag.ICreate>,
): ICommunityPlatformFlag.ICreate {
  return {
    name:
      input?.name ??
      RandomGenerator.alphabets(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      )
        .replace(/([a-z])([A-Z])/g, "$1_$2")
        .toLowerCase(),
    value: input?.value ?? RandomGenerator.pick([true, false] as const),
    description:
      input?.description ??
      (typia.random<boolean>()
        ? RandomGenerator.paragraph({
            sentences: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
            >(),
            wordMin: 3,
            wordMax: 7,
          })
        : undefined),
  };
}