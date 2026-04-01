import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_community_community(
  input?: DeepPartial<IRedditCommunityCommunity.ICreate>,
): IRedditCommunityCommunity.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(2),
    description:
      input?.description ??
      RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    iconImageUri:
      input?.iconImageUri ?? typia.random<string & tags.Format<"uri">>(),
  };
}
