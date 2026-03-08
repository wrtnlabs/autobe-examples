import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommentVotesSum } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommentVotesSum";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditLikeCommentVotesSumTransformer } from "../transformers/RedditLikeCommentVotesSumTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeCommentsCommentIdVotesSummary(props: {
  commentId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeCommentVotesSum> {
  const sum = await MyGlobal.prisma.reddit_like_comment_votes_sums.findUnique({
    where: { comment_id: props.commentId },
    ...RedditLikeCommentVotesSumTransformer.select(),
  });
  if (!sum) {
    return {
      vote_sum: 0,
      upvote_count: 0,
      downvote_count: 0,
      last_vote_at: null,
    };
  }
  return await RedditLikeCommentVotesSumTransformer.transform(sum);
}
