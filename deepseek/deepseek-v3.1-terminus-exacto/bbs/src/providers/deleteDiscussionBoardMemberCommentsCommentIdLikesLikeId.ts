import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteDiscussionBoardMemberCommentsCommentIdLikesLikeId(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  likeId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify the like exists and belongs to the authenticated member
  const existingLike =
    await MyGlobal.prisma.discussion_board_comment_likes.findFirst({
      where: {
        id: props.likeId,
        discussion_board_member_id: props.member.id,
        discussion_board_comment_id: props.commentId,
        deleted_at: null,
      },
    });

  if (!existingLike) {
    throw new HttpException(
      "Comment like not found or you don't have permission to delete it",
      404,
    );
  }

  // Permanently delete the like record
  await MyGlobal.prisma.discussion_board_comment_likes.delete({
    where: {
      id: props.likeId,
    },
  });
}
