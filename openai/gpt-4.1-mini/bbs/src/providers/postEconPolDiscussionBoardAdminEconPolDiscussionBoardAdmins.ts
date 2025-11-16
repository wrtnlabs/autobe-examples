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

export async function postEconPolDiscussionBoardAdminEconPolDiscussionBoardAdmins(props: {
  admin: AdminPayload;
  body: IEconPolDiscussionBoardAdmin.ICreate;
}): Promise<IEconPolDiscussionBoardAdmin> {
  const existingAdmin =
    await MyGlobal.prisma.econ_pol_discussion_board_admins.findFirst({
      where: {
        OR: [
          { username: props.body.adminUsername },
          { email: props.body.email },
        ],
        deleted_at: null,
      },
    });

  if (existingAdmin !== null) {
    throw new Error("Admin username or email already exists");
  }

  const password_hash = await PasswordUtil.hash(props.body.password);

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.econ_pol_discussion_board_admins.create(
    {
      data: {
        id: v4(),
        username: props.body.adminUsername,
        email: props.body.email,
        password_hash,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    },
  );

  return {
    adminUsername: created.username,
    email: created.email,
    password_hash: created.password_hash,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
    role: props.body.role,
    is_active: true,
  };
}
