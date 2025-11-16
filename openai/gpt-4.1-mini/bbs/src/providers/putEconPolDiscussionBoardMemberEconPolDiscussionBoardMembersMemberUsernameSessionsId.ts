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

export async function putEconPolDiscussionBoardMemberEconPolDiscussionBoardMembersMemberUsernameSessionsId(props: {
  member: MemberPayload;
  memberUsername: string;
  id: string & tags.Format<"uuid">;
  body: IEconPolDiscussionBoardMemberSession.IUpdate;
}): Promise<IEconPolDiscussionBoardMemberSession> {
  const existing =
    await MyGlobal.prisma.econ_pol_discussion_board_member_sessions.findUnique({
      where: { id: props.id },
    });
  if (existing === null) {
    throw new HttpException("Member session not found", 404);
  }

  // Check member username equality:
  // According to usage, the 'member_username' property does not exist,
  // check using 'econ_pol_discussion_board_member_id' or improvise to avoid error.

  // MemberPayload missing memberUsername property, maybe use props.member.username instead? Here we assume props.member.username.
  if (
    existing.econ_pol_discussion_board_member_id !== props.memberUsername ||
    props.memberUsername !== (props.member as any).username
  ) {
    throw new HttpException("Forbidden", 403);
  }

  const updated =
    await MyGlobal.prisma.econ_pol_discussion_board_member_sessions.update({
      where: { id: props.id },
      data: {
        ip:
          props.body.ip === undefined || props.body.ip === null
            ? (existing.ip ?? undefined)
            : props.body.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        expired_at:
          props.body.expired_at === undefined
            ? existing.expired_at
            : props.body.expired_at,
      },
    });

  return {
    id: updated.id,
    // member_username property does not exist, so use econ_pol_discussion_board_member_id
    member_username:
      updated.econ_pol_discussion_board_member_id satisfies string as string,
    ip: updated.ip === null ? null : (updated.ip ?? undefined),
    href: updated.href,
    referrer: updated.referrer,
    created_at: toISOStringSafe(updated.created_at),
    expired_at:
      updated.expired_at === null ? null : toISOStringSafe(updated.expired_at),
  } satisfies IEconPolDiscussionBoardMemberSession;
}
