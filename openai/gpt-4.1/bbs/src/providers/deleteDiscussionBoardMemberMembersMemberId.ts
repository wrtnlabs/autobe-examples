import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteDiscussionBoardMemberMembersMemberId(props: {
  member: MemberPayload;
  memberId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, memberId } = props;

  // 1. Fetch the member by memberId
  const target = await MyGlobal.prisma.discussion_board_members.findUnique({
    where: { id: memberId },
  });
  if (!target) {
    throw new HttpException("Member not found", 404);
  }

  // 2. Check if already soft-deleted
  if (target.deleted_at !== null) {
    throw new HttpException("Account already deleted", 409);
  }

  // 3. Only allow delete by self (admin path not handled here)
  if (member.id !== memberId) {
    throw new HttpException(
      "Permission denied: cannot delete another member's account",
      403,
    );
  }

  // 4. Set deleted_at to now (ISO string)
  await MyGlobal.prisma.discussion_board_members.update({
    where: { id: memberId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
