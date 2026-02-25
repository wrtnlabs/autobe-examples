import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_community_community_moderator(
  input?: DeepPartial<IRedditCommunityCommunityModerator.ICreate>,
): IRedditCommunityCommunityModerator.ICreate {
  return {
    userId: input?.userId ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
