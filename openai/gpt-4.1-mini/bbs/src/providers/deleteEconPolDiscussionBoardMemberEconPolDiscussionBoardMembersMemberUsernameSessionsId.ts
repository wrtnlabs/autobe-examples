import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteEconPolDiscussionBoardMemberEconPolDiscussionBoardMembersMemberUsernameSessionsId(props: {
  member: MemberPayload;
  memberUsername: string;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  // Confirm member with given username exists
  const member =
    await MyGlobal.prisma.econ_pol_discussion_board_members.findUnique({
      where: { username: props.memberUsername },
    });

  if (!member) {
    throw new HttpException("Member not found", 404);
  }

  // Confirm session exists and belongs to member
  const session =
    await MyGlobal.prisma.econ_pol_discussion_board_member_sessions.findUnique({
      where: { id: props.id },
    });

  if (!session) {
    throw new HttpException("Session not found", 404);
  }

  if (session.econ_pol_discussion_board_member_id !== member.id) {
    throw new HttpException("Forbidden", 403);
  }

  // Delete the session
  await MyGlobal.prisma.econ_pol_discussion_board_member_sessions.delete({
    where: { id: props.id },
  });
}
