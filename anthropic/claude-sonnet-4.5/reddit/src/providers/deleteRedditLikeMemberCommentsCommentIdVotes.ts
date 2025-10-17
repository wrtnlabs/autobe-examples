import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteRedditLikeMemberCommentsCommentIdVotes(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, commentId } = props;

  // Find the vote record for this member and comment using unique constraint
  const vote = await MyGlobal.prisma.reddit_like_comment_votes.findFirst({
    where: {
      reddit_like_member_id: member.id,
      reddit_like_comment_id: commentId,
    },
  });

  // Verify vote exists
  if (!vote) {
    throw new HttpException(
      "No vote found on this comment. Cannot remove a vote that does not exist.",
      404,
    );
  }

  // Hard delete the vote record (schema has no deleted_at field)
  await MyGlobal.prisma.reddit_like_comment_votes.delete({
    where: {
      id: vote.id,
    },
  });
}
