import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteMembersMemberIdPostsPostIdLikes(props: {
  member: MemberPayload;
  memberId: string & tags.Format<"uuid">;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify the authenticated member matches the provided memberId
  if (props.member.id !== props.memberId) {
    throw new HttpException("You can only delete your own likes", 403);
  }

  // Check if the like record exists and belongs to the member
  const existingLike =
    await MyGlobal.prisma.discussion_board_post_likes.findUnique({
      where: {
        discussion_board_member_id_discussion_board_post_id: {
          discussion_board_member_id: props.memberId,
          discussion_board_post_id: props.postId,
        },
      },
    });

  if (!existingLike) {
    throw new HttpException("Like record not found", 404);
  }

  // Verify the like record belongs to the authenticated member
  if (existingLike.discussion_board_member_id !== props.memberId) {
    throw new HttpException("Forbidden", 403);
  }

  // Perform the hard delete
  await MyGlobal.prisma.discussion_board_post_likes.delete({
    where: {
      discussion_board_member_id_discussion_board_post_id: {
        discussion_board_member_id: props.memberId,
        discussion_board_post_id: props.postId,
      },
    },
  });
}
