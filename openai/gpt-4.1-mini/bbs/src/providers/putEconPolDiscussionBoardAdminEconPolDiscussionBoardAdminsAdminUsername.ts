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

export async function putEconPolDiscussionBoardAdminEconPolDiscussionBoardAdminsAdminUsername(props: {
  admin: AdminPayload;
  adminUsername: string;
  body: IEconPolDiscussionBoardAdmin.IUpdate;
}): Promise<IEconPolDiscussionBoardAdmin> {
  const existing =
    await MyGlobal.prisma.econ_pol_discussion_board_admins.findUnique({
      where: { username: props.adminUsername },
      select: {
        id: true,
        username: true,
        email: true,
        password_hash: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

  if (!existing) {
    throw new HttpException("Administrator account not found", 404);
  }

  const passwordHash = await PasswordUtil.hash(props.body.password);

  const updated = await MyGlobal.prisma.econ_pol_discussion_board_admins.update(
    {
      where: { username: props.adminUsername },
      data: {
        email: props.body.email,
        password_hash: passwordHash,
        deleted_at: props.body.deleted_at ?? null,
        updated_at: toISOStringSafe(new Date()),
      },
    },
  );

  return {
    adminUsername: updated.username,
    email: updated.email,
    password_hash: updated.password_hash,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
    // role and is_active not from database, derive from props.admin
    role: props.admin.type,
    is_active: true,
  };
}
