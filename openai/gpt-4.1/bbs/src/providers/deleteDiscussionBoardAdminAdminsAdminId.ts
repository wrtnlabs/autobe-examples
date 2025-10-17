import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteDiscussionBoardAdminAdminsAdminId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Find the target admin (must be active)
  const admin = await MyGlobal.prisma.discussion_board_admins.findFirst({
    where: {
      id: props.adminId,
      deleted_at: null,
    },
  });
  if (!admin) {
    throw new HttpException("Administrator not found or already deleted", 404);
  }
  // 2. Soft-delete by updating deleted_at
  await MyGlobal.prisma.discussion_board_admins.update({
    where: { id: props.adminId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
