import { ICommunityPlatformChannelFeature } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformChannelFeature";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_channel_feature(
  input?: DeepPartial<ICommunityPlatformChannelFeature.ICreate>,
): ICommunityPlatformChannelFeature.ICreate {
  return {
    name:
      input?.name ??
      RandomGenerator.alphabets(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<10> & tags.Maximum<50>
        >(),
      ),
    description:
      input?.description ??
      RandomGenerator.content({
        paragraphs: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<2>
        >(),
      }),
    enabled: input?.enabled ?? RandomGenerator.pick([true, false] as const),
  };
}
