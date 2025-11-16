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

export async function postEconPolDiscussionBoardAdminEconPolDiscussionBoardAdminsAdminUsernameSessions(props: {
  admin: AdminPayload;
  adminUsername: string;
  body: IEconPolDiscussionBoardAdminSession.ICreate;
}): Promise<IEconPolDiscussionBoardAdminSession> {
  const admin =
    await MyGlobal.prisma.econ_pol_discussion_board_admins.findFirst({
      where: { username: props.adminUsername },
    });

  if (admin === null) {
    throw new HttpException("Administrator not found", 404);
  }

  const created =
    await MyGlobal.prisma.econ_pol_discussion_board_admin_sessions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        econ_pol_discussion_board_admin_id: admin.id,
        ip: props.body.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        expired_at: props.body.expiredAt
          ? toISOStringSafe(props.body.expiredAt)
          : null,
        created_at: toISOStringSafe(new Date()),
      },
    });

  return {
    id: created.id,
    econPolDiscussionBoardAdminId: created.econ_pol_discussion_board_admin_id,
    ip: created.ip,
    href: created.href,
    referrer: created.referrer,
    expiredAt:
      created.expired_at === null ? null : toISOStringSafe(created.expired_at),
    createdAt: toISOStringSafe(created.created_at),
  };
}
