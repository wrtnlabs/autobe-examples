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

export async function getEconPolDiscussionBoardAdminEconPolDiscussionBoardAdminsAdminUsernameSessionsId(props: {
  admin: AdminPayload;
  adminUsername: string;
  id: string & tags.Format<"uuid">;
}): Promise<IEconPolDiscussionBoardAdminSession> {
  const admin =
    await MyGlobal.prisma.econ_pol_discussion_board_admins.findFirst({
      where: { username: props.adminUsername },
    });

  if (admin === null) {
    throw new HttpException("Administrator not found", 404);
  }

  const session =
    await MyGlobal.prisma.econ_pol_discussion_board_admin_sessions.findFirst({
      where: {
        id: props.id,
        econ_pol_discussion_board_admin_id: admin.id,
      },
    });

  if (session === null) {
    throw new HttpException("Session not found", 404);
  }

  return {
    id: session.id,
    econPolDiscussionBoardAdminId:
      session.econ_pol_discussion_board_admin_id satisfies string as string,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    createdAt: toISOStringSafe(session.created_at),
    expiredAt:
      session.expired_at === null ? null : toISOStringSafe(session.expired_at),
  };
}
