import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunityCommunities } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityCommunities";
import { IRedditPlatformCommunityConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityConfiguration";
export function prepare_random_reddit_platform_community_communities(
  input?: DeepPartial<IRedditPlatformCommunityCommunities.ICreate>,
): IRedditPlatformCommunityCommunities.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(1),
    description:
      input?.description ??
      RandomGenerator.paragraph({
        sentences: typia.random<number & tags.Type<"uint32"> & tags.Minimum<3> & tags.Maximum<5>>(),
      }),
    config: JSON.stringify({
      rules: RandomGenerator.paragraph({
        sentences: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<2>>(),
      }),
      visibility: RandomGenerator.pick([
        "public",
        "private",
        "members-only",
      ] as const),
      allowComments: RandomGenerator.pick([true, false] as const),
      maxMembers:
        typia.random<number & tags.Type<"uint32"> & tags.Minimum<10> & tags.Maximum<1000>>(),
    }),
  };
}