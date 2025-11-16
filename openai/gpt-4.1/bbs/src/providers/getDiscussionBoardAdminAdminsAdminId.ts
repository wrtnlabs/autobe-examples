import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getDiscussionBoardAdminAdminsAdminId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAdmin> {
  const admin = await MyGlobal.prisma.discussion_board_admins.findUnique({
    where: { id: props.adminId },
  });

  if (!admin) {
    throw new HttpException("Admin not found", 404);
  }

  return {
    id: admin.id,
    email: admin.email,
    is_email_verified: admin.is_email_verified,
    is_active: admin.is_active,
    is_blocked: admin.is_blocked,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at:
      admin.deleted_at === null ? null : toISOStringSafe(admin.deleted_at),
  };
}
