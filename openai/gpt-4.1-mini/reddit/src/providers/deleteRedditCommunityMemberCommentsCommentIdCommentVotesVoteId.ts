import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteRedditCommunityMemberCommentsCommentIdCommentVotesVoteId(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<void> {
  const vote = await MyGlobal.prisma.reddit_community_comment_votes.findUnique({
    where: { id: props.voteId },
    select: { member_id: true, comment_id: true },
  });
  if (vote === null) {
    throw new HttpException("Vote not found", 404);
  }
  if (vote.comment_id !== props.commentId) {
    throw new HttpException("Comment ID does not match vote", 404);
  }
  if (vote.member_id !== props.member.id) {
    throw new HttpException("Unauthorized: You do not own this vote", 403);
  }
  await MyGlobal.prisma.reddit_community_comment_votes.delete({
    where: { id: props.voteId },
  });
}
