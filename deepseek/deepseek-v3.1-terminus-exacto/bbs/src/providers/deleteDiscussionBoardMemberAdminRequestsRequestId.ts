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

export async function deleteDiscussionBoardMemberAdminRequestsRequestId(props: {
  member: MemberPayload;
  requestId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Find the admin request and verify it exists
  const request =
    await MyGlobal.prisma.discussion_board_admin_requests.findUniqueOrThrow({
      where: { id: props.requestId },
      select: {
        id: true,
        discussion_board_member_id: true,
        deleted_at: true,
        status: true,
      },
    });
  // 2. Check if already deleted
  if (request.deleted_at !== null) {
    throw new HttpException("Admin request already deleted", 400);
  }
  // 3. Check authorization
  const isOwner = request.discussion_board_member_id === props.member.id;
  if (!isOwner) {
    // Check if member has admin privileges
    const member =
      await MyGlobal.prisma.discussion_board_members.findUniqueOrThrow({
        where: { id: props.member.id },
        select: { admin_grade: true },
      });
    const isAdmin =
      member.admin_grade === "regular" || member.admin_grade === "super";
    if (!isAdmin) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // 4. Perform soft deletion
  await MyGlobal.prisma.discussion_board_admin_requests.update({
    where: { id: props.requestId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
  // 5. Return void as specified
}
