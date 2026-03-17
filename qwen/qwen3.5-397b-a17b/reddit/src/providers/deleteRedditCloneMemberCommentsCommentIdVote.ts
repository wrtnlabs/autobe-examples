import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteRedditCloneMemberCommentsCommentIdVote(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Validate comment exists and is not deleted
  await MyGlobal.prisma.reddit_clone_comments.findUniqueOrThrow({
    where: {
      id: props.commentId,
      deleted_at: null,
    },
  });
  // Find the active vote record for this member on this comment
  const vote = await MyGlobal.prisma.reddit_clone_votes.findFirst({
    where: {
      member_id: props.member.id,
      target_type: "COMMENT",
      target_id: props.commentId,
      deleted_at: null,
    },
  });
  // If no active vote found, return 404
  if (vote === null) {
    throw new HttpException("Vote not found", 404);
  }
  // Soft-delete the vote by setting deleted_at
  await MyGlobal.prisma.reddit_clone_votes.update({
    where: {
      id: vote.id,
    },
    data: {
      deleted_at: new Date(),
    },
  });
}
