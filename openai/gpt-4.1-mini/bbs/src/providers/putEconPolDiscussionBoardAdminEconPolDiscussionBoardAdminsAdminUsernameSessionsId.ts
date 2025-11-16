import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPolDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardAdminSession";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putEconPolDiscussionBoardAdminEconPolDiscussionBoardAdminsAdminUsernameSessionsId(props: {
  admin: AdminPayload;
  adminUsername: string;
  id: string & tags.Format<"uuid">;
  body: IEconPolDiscussionBoardAdminSession.IUpdate;
}): Promise<IEconPolDiscussionBoardAdminSession> {
  // Find admin by username
  const admin =
    await MyGlobal.prisma.econ_pol_discussion_board_admins.findUnique({
      where: { username: props.adminUsername },
    });

  if (!admin) {
    throw new HttpException("Admin user not found", 404);
  }

  // Find admin session by id and admin id
  const session =
    await MyGlobal.prisma.econ_pol_discussion_board_admin_sessions.findUnique({
      where: { id: props.id },
    });

  if (!session || session.econ_pol_discussion_board_admin_id !== admin.id) {
    throw new HttpException("Admin session not found", 404);
  }

  // Update the session with new details
  const updated =
    await MyGlobal.prisma.econ_pol_discussion_board_admin_sessions.update({
      where: { id: props.id },
      data: {
        ip: props.body.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        expired_at: props.body.expiredAt ?? null,
      },
    });

  return {
    id: updated.id,
    econPolDiscussionBoardAdminId:
      updated.econ_pol_discussion_board_admin_id satisfies string as string &
        tags.Format<"uuid">,
    ip: updated.ip,
    href: updated.href,
    referrer: updated.referrer,
    createdAt: toISOStringSafe(updated.created_at) as string &
      tags.Format<"date-time">,
    expiredAt:
      updated.expired_at !== null ? toISOStringSafe(updated.expired_at) : null,
  };
}
