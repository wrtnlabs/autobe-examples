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
  const admin = await MyGlobal.prisma.discussion_board_admins.findFirst({
    where: {
      id: props.adminId,
      deleted_at: null, // Only active (not soft-deleted)
    },
  });

  if (!admin) {
    throw new HttpException("Admin not found or deleted", 404);
  }

  return {
    id: admin.id,
    email: admin.email,
    display_name: admin.display_name,
    avatar_url: admin.avatar_url == null ? undefined : admin.avatar_url,
    is_locked: admin.is_locked,
    deleted_at:
      admin.deleted_at == null ? undefined : toISOStringSafe(admin.deleted_at),
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
  };
}
