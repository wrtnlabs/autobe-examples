import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteDiscussionBoardMemberDiscussionBoardMembersDiscussionBoardMemberId(props: {
  member: MemberPayload;
  discussionBoardMemberId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, discussionBoardMemberId } = props;

  const memberRecord =
    await MyGlobal.prisma.discussion_board_members.findUniqueOrThrow({
      where: { id: discussionBoardMemberId },
    });

  if (member.id !== discussionBoardMemberId) {
    throw new HttpException(
      "Forbidden: You can only delete your own member account",
      403,
    );
  }

  await MyGlobal.prisma.discussion_board_members.delete({
    where: { id: discussionBoardMemberId },
  });
}
