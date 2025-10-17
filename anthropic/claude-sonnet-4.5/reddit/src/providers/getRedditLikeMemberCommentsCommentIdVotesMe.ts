import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommentVote";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getRedditLikeMemberCommentsCommentIdVotesMe(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeCommentVote> {
  const { member, commentId } = props;

  const vote = await MyGlobal.prisma.reddit_like_comment_votes.findFirst({
    where: {
      reddit_like_member_id: member.id,
      reddit_like_comment_id: commentId,
    },
  });

  if (!vote) {
    throw new HttpException("You have not voted on this comment", 404);
  }

  return {
    id: vote.id as string & tags.Format<"uuid">,
    vote_value: vote.vote_value,
    created_at: toISOStringSafe(vote.created_at),
    updated_at: toISOStringSafe(vote.updated_at),
  };
}
