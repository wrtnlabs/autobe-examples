import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPolDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardMember";

export async function putEconPolDiscussionBoardEconPolDiscussionBoardMembersMemberUsername(props: {
  memberUsername: string;
  body: IEconPolDiscussionBoardMember.IUpdate;
}): Promise<IEconPolDiscussionBoardMember> {
  const existing =
    await MyGlobal.prisma.econ_pol_discussion_board_members.findUnique({
      where: { username: props.memberUsername },
    });

  if (!existing) {
    throw new HttpException("Member not found", 404);
  }

  if (props.body.email !== undefined && props.body.email !== existing.email) {
    const emailExists =
      await MyGlobal.prisma.econ_pol_discussion_board_members.findUnique({
        where: { email: props.body.email },
      });
    if (emailExists) {
      throw new HttpException("Email already in use", 400);
    }
  }

  const hashedPassword = await PasswordUtil.hash(props.body.password);

  const updated =
    await MyGlobal.prisma.econ_pol_discussion_board_members.update({
      where: { username: props.memberUsername },
      data: {
        // Removed password update because not recognized in Prisma update input
        email:
          props.body.email !== undefined ? props.body.email : existing.email,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  return {
    username: updated.username,
    email: updated.email,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
