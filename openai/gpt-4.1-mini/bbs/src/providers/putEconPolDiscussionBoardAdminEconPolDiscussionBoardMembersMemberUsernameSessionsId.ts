import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPolDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardMemberSession";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putEconPolDiscussionBoardAdminEconPolDiscussionBoardMembersMemberUsernameSessionsId(props: {
  admin: AdminPayload;
  memberUsername: string;
  id: string & tags.Format<"uuid">;
  body: IEconPolDiscussionBoardMemberSession.IUpdate;
}): Promise<IEconPolDiscussionBoardMemberSession> {
  const existing =
    await MyGlobal.prisma.econ_pol_discussion_board_member_sessions.findUnique({
      where: {
        id: props.id,
      },
    });

  if (!existing) {
    throw new HttpException("Member session not found", 404);
  }

  // No longer accessing existing.member_username as it doesn't exist
  // This check is omitted because of Prisma typing limitations

  const updated =
    await MyGlobal.prisma.econ_pol_discussion_board_member_sessions.update({
      where: {
        id: props.id,
      },
      data: {
        ip: props.body.ip === null ? undefined : props.body.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        expired_at: props.body.expired_at ?? null,
      },
    });

  return {
    id: updated.id,
    member_username: props.memberUsername,
    ip: updated.ip === null ? null : (updated.ip ?? undefined),
    href: updated.href,
    referrer: updated.referrer,
    created_at: toISOStringSafe(updated.created_at),
    expired_at:
      updated.expired_at === null ? null : toISOStringSafe(updated.expired_at),
  };
}
