import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPolDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getEconPolDiscussionBoardAdminEconPolDiscussionBoardAdminsAdminUsername(props: {
  admin: AdminPayload;
  adminUsername: string;
}): Promise<IEconPolDiscussionBoardAdmin> {
  const admin =
    await MyGlobal.prisma.econ_pol_discussion_board_admins.findFirst({
      where: { username: props.adminUsername, deleted_at: null },
      select: {
        username: true,
        email: true,
        password_hash: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

  if (!admin) {
    throw new HttpException("Admin not found", 404);
  }

  return {
    adminUsername: admin.username,
    email: admin.email,
    password_hash: admin.password_hash,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at: admin.deleted_at ? toISOStringSafe(admin.deleted_at) : null,
    role: "admin",
    is_active: true,
  };
}
