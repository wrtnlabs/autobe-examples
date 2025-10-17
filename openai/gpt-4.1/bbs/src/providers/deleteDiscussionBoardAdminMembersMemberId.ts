import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteDiscussionBoardAdminMembersMemberId(props: {
  admin: AdminPayload;
  memberId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Find the member, or throw 404 if not found
  const member = await MyGlobal.prisma.discussion_board_members.findUnique({
    where: { id: props.memberId },
  });
  if (!member) {
    throw new HttpException("Member not found", 404);
  }
  // 2. Check if already soft-deleted
  if (member.deleted_at !== null) {
    throw new HttpException("Member account is already deleted", 409);
  }
  // 3. Update deleted_at for soft delete (use ISO string)
  await MyGlobal.prisma.discussion_board_members.update({
    where: { id: props.memberId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
