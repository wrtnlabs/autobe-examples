import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommentVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_like_comment_vote(
  input?: DeepPartial<IRedditLikeCommentVote.ICreate> | undefined,
): IRedditLikeCommentVote.ICreate {
  return {
    value: input?.value ?? RandomGenerator.pick([1, -1, null] as const),
  };
}
