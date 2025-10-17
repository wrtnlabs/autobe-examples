import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteDiscussionBoardMemberUsersUserIdFollowedTagsFollowedTagId(props: {
  member: MemberPayload;
  userId: string & tags.Format<"uuid">;
  followedTagId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, userId, followedTagId } = props;

  const followedTag =
    await MyGlobal.prisma.discussion_board_followed_tags.findUniqueOrThrow({
      where: { id: followedTagId },
    });

  if (followedTag.discussion_board_member_id !== member.id) {
    throw new HttpException(
      "Unauthorized: You can only unfollow your own followed tags",
      403,
    );
  }

  if (userId !== member.id) {
    throw new HttpException(
      "Unauthorized: User ID does not match authenticated member",
      403,
    );
  }

  await MyGlobal.prisma.discussion_board_followed_tags.update({
    where: { id: followedTagId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
