import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPolDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardMemberSession";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getEconPolDiscussionBoardMemberEconPolDiscussionBoardMembersMemberUsernameSessionsId(props: {
  member: MemberPayload;
  memberUsername: string;
  id: string & tags.Format<"uuid">;
}): Promise<IEconPolDiscussionBoardMemberSession> {
  const session =
    await MyGlobal.prisma.econ_pol_discussion_board_member_sessions.findFirst({
      where: {
        econ_pol_discussion_board_member_id: props.memberUsername,
        id: props.id,
      },
    });

  if (!session) {
    throw new HttpException("Session not found", 404);
  }

  if (session.econ_pol_discussion_board_member_id !== props.memberUsername) {
    throw new HttpException("Forbidden", 403);
  }

  return {
    id: session.id,
    member_username: session.econ_pol_discussion_board_member_id,
    ip: session.ip === undefined ? undefined : session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at:
      session.expired_at === undefined
        ? undefined
        : session.expired_at === null
          ? null
          : toISOStringSafe(session.expired_at),
  };
}
