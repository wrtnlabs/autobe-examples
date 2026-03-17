import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_community_vote(
  input?: DeepPartial<IRedditCommunityVote.ICreate>,
): IRedditCommunityVote.ICreate {
  return {
    vote_type:
      input?.vote_type ?? RandomGenerator.pick(["upvote", "downvote"] as const),
    target_post_id:
      (input?.target_post_id ?? input?.target_comment_id !== undefined)
        ? null
        : typia.random<string & tags.Format<"uuid">>(),
    target_comment_id:
      (input?.target_comment_id ?? input?.target_post_id !== undefined)
        ? null
        : typia.random<string & tags.Format<"uuid">>(),
  };
}
