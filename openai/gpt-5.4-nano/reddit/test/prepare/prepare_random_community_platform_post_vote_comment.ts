import { ICommunityPlatformPostVoteComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_post_vote_comment(
  input?: DeepPartial<ICommunityPlatformPostVoteComment.ICreate> | undefined,
): ICommunityPlatformPostVoteComment.ICreate {
  return {
    bodyText:
      input?.bodyText ??
      RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 2,
        sentenceMax: 4,
        wordMin: 3,
        wordMax: 8,
      }),
    parentCommentId:
      input?.parentCommentId !== undefined
        ? (input.parentCommentId as
            | (string & tags.Format<"uuid">)
            | null
            | undefined)
        : null,
  };
}
