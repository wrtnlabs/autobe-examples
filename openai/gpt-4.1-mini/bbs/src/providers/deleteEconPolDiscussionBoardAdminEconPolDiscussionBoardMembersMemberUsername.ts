import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteEconPolDiscussionBoardAdminEconPolDiscussionBoardMembersMemberUsername(props: {
  admin: AdminPayload;
  memberUsername: string;
}): Promise<void> {
  const member =
    await MyGlobal.prisma.econ_pol_discussion_board_members.findUnique({
      where: { username: props.memberUsername },
    });

  if (!member) {
    throw new HttpException("Member not found", 404);
  }

  await MyGlobal.prisma.econ_pol_discussion_board_members.delete({
    where: { username: props.memberUsername },
  });
}
