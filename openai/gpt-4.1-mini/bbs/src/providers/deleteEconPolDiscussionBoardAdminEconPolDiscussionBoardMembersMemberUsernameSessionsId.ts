import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteEconPolDiscussionBoardAdminEconPolDiscussionBoardMembersMemberUsernameSessionsId(props: {
  admin: AdminPayload;
  memberUsername: string;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const member =
    await MyGlobal.prisma.econ_pol_discussion_board_members.findUnique({
      where: { username: props.memberUsername },
    });

  if (member === null) {
    throw new HttpException("Member not found", 404);
  }

  const session =
    await MyGlobal.prisma.econ_pol_discussion_board_member_sessions.findUnique({
      where: { id: props.id },
    });

  if (
    session === null ||
    session.econ_pol_discussion_board_member_id !== member.id
  ) {
    throw new HttpException("Member session not found", 404);
  }

  await MyGlobal.prisma.econ_pol_discussion_board_member_sessions.delete({
    where: { id: props.id },
  });
}
