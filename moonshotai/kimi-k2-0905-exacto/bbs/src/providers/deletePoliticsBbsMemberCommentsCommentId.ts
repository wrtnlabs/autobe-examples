import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deletePoliticsBbsMemberCommentsCommentId(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, commentId } = props;

  // Validate comment ownership through member-specific subtype relationship
  const memberComment =
    await MyGlobal.prisma.politics_bbs_comment_of_members.findFirst({
      where: {
        politics_bbs_member_id: member.id,
        politics_bbs_comment_id: commentId,
      },
    });

  if (!memberComment) {
    throw new HttpException(
      "Unauthorized: You can only delete your own comments",
      403,
    );
  }

  // Check if comment exists and verify actor type
  const comment = await MyGlobal.prisma.politics_bbs_comments.findUniqueOrThrow(
    {
      where: { id: commentId },
    },
  );

  if (comment.actor_type !== "member") {
    throw new HttpException(
      "Forbidden: Cannot interact with non-member comments",
      403,
    );
  }

  // Perform soft delete - set deleted_at timestamp while preserving content
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.politics_bbs_comments.update({
    where: { id: commentId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}
