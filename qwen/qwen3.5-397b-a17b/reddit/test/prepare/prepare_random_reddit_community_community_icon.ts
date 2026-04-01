import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_community_community_icon(
  input?: DeepPartial<IRedditCommunityCommunityIcon.ICreate>,
): IRedditCommunityCommunityIcon.ICreate {
  return {
    uri: input?.uri ?? typia.random<string & tags.Format<"uri">>(),
  };
}
