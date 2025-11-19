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
  const existing = await MyGlobal.prisma.discussion_board_member.findUnique({
    where: { id: props.discussionBoardMemberId },
  });

  if (!existing) {
    throw new HttpException("Discussion board member not found", 404);
  }

  // Authorization to delete is assumed checked externally via memberAuthorize

  await MyGlobal.prisma.discussion_board_member.delete({
    where: { id: props.discussionBoardMemberId },
  });
}
