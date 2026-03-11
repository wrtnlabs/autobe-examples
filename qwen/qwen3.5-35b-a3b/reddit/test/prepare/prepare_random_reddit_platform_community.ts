import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_platform_community(
  input?: DeepPartial<IRedditPlatformCommunity.ICreate>,
): IRedditPlatformCommunity.ICreate {
  return {
    name:
      input?.name ??
      RandomGenerator.alphaNumeric(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<3> & tags.Maximum<21>
        >(),
      ),
    description:
      input?.description ??
      RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 15 }),
    icon_url:
      input?.icon_url ??
      `https://${RandomGenerator.alphaNumeric(8)}.com/icon.png`,
  };
}
