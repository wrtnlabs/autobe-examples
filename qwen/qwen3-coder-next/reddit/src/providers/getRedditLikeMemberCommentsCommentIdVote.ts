import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommentVotesSum } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommentVotesSum";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeMemberCommentsCommentIdVote(props: {
  member: MemberPayload;
  commentId: string;
}): Promise<IRedditLikeCommentVotesSum> {
  const vote = await MyGlobal.prisma.reddit_like_comment_votes.findUnique({
    where: {
      reddit_like_comment_id_reddit_like_member_id: {
        reddit_like_comment_id: props.commentId,
        reddit_like_member_id: props.member.id,
      },
    },
    select: { value: true },
  });
  const sum =
    await MyGlobal.prisma.reddit_like_comment_votes_sums.findUniqueOrThrow({
      where: { comment_id: props.commentId },
      select: {
        vote_sum: true,
      },
    });
  return {
    voteValue:
      vote?.value === 1 || vote?.value === -1 || vote?.value === null
        ? vote.value
        : null,
    commentScore: sum.vote_sum,
  };
}
