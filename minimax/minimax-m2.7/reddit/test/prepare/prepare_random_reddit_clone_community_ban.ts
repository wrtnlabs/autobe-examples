import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_clone_community_ban(
  input?: DeepPartial<IRedditCloneCommunityBan.ICreate>,
): IRedditCloneCommunityBan.ICreate {
  return {
    expiresAt:
      input?.expiresAt ??
      (Math.random() > 0.5
        ? null
        : (new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString() as string & tags.Format<"date-time">)),
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 2 }),
    redditCloneUserId:
      input?.redditCloneUserId ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
