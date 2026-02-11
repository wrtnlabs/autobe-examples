import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityModerationActionOfPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationActionOfPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_community_moderation_action_of_post(
  input?: DeepPartial<IRedditCommunityModerationActionOfPost.ICreate>,
): IRedditCommunityModerationActionOfPost.ICreate {
  return {
    target_type:
      input?.target_type ?? RandomGenerator.pick(["post", "comment"] as const),
    action_type:
      input?.action_type ??
      RandomGenerator.pick(["delete", "ban", "approve", "dismiss"] as const),
    reason:
      input?.reason ??
      RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 15 }),
  };
}
