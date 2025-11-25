import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteDiscussionBoardMemberPostsPostIdLikesLikeId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  likeId: string & tags.Format<"uuid">;
}): Promise<void> {
  // First verify the like record exists and belongs to the authenticated member
  const existingLike =
    await MyGlobal.prisma.discussion_board_post_likes.findFirst({
      where: {
        id: props.likeId,
        discussion_board_member_id: props.member.id,
        discussion_board_post_id: props.postId,
        deleted_at: null,
      },
    });

  if (!existingLike) {
    throw new HttpException(
      "Like record not found or you don't have permission to delete it",
      404,
    );
  }

  // Perform hard delete as specified
  await MyGlobal.prisma.discussion_board_post_likes.delete({
    where: {
      id: props.likeId,
    },
  });
}
