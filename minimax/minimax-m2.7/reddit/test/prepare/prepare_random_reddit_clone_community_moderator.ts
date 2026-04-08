import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_clone_community_moderator(
  input?: DeepPartial<IRedditCloneCommunityModerator.ICreate>,
): IRedditCloneCommunityModerator.ICreate {
  return {
    memberId: input?.memberId ?? typia.random<string & tags.Format<"uuid">>(),
    role: input?.role ?? "moderator",
  };
}
