import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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
  // Lookup admin to ensure existence and not already deleted
  const target = await MyGlobal.prisma.discussion_board_admins.findFirst({
    where: {
      id: props.adminId,
      deleted_at: null,
    },
  });
  if (!target) {
    throw new HttpException("Admin account not found or already deleted.", 404);
  }

  // Delete all admin sessions for target admin
  await MyGlobal.prisma.discussion_board_admin_sessions.deleteMany({
    where: {
      admin_id: props.adminId,
    },
  });

  // Hard delete the admin account
  await MyGlobal.prisma.discussion_board_admins.delete({
    where: {
      id: props.adminId,
    },
  });
}
