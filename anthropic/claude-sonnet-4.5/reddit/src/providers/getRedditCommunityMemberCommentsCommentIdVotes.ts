import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getRedditCommunityMemberCommentsCommentIdVotes(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityCommentVote> {
  const vote = await MyGlobal.prisma.reddit_community_comment_votes.findFirst({
    where: {
      reddit_community_comment_id: props.commentId,
      reddit_community_member_id: props.member.id,
    },
  });

  if (!vote) {
    throw new HttpException("No vote found for this comment", 404);
  }

  return {
    id: vote.id,
    reddit_community_comment_id: vote.reddit_community_comment_id,
    reddit_community_member_id: vote.reddit_community_member_id,
    vote_type: vote.vote_type as 1 | -1,
    created_at: toISOStringSafe(vote.created_at),
    updated_at: toISOStringSafe(vote.updated_at),
  };
}
