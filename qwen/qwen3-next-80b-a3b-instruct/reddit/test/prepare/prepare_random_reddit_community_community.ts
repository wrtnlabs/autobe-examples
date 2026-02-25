import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_community_community(
  input?: DeepPartial<IRedditCommunityCommunity.ICreate> | undefined,
): IRedditCommunityCommunity.ICreate {
  return {
    name:
      input?.name ??
      RandomGenerator.alphaNumeric(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<3> & tags.Maximum<50>
        >(),
      ),
    description:
      input?.description ??
      RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 5,
        sentenceMax: 15,
      }),
    icon_url:
      input?.icon_url ??
      (typia.random<boolean>()
        ? (typia.random<string & tags.Format<"uri">>() satisfies string as string & tags.MaxLength<80000> & tags.Format<"uri">)
        : null),
  };
}