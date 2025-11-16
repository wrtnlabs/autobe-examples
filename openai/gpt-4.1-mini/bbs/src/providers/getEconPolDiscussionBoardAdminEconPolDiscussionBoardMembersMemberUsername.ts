import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPolDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardMember";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getEconPolDiscussionBoardAdminEconPolDiscussionBoardMembersMemberUsername(props: {
  admin: AdminPayload;
  memberUsername: string;
}): Promise<IEconPolDiscussionBoardMember> {
  const member =
    await MyGlobal.prisma.econ_pol_discussion_board_members.findUnique({
      where: { username: props.memberUsername },
      select: {
        username: true,
        email: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

  if (!member) {
    throw new HttpException(
      `Member with username ${props.memberUsername} not found`,
      404,
    );
  }

  return {
    username: member.username,
    email: member.email,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at: member.deleted_at ? toISOStringSafe(member.deleted_at) : null,
  };
}
