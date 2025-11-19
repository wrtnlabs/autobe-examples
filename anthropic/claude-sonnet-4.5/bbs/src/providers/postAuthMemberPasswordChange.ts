import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postAuthMemberPasswordChange(props: {
  member: MemberPayload;
  body: IDiscussionBoardMember.IChangePassword;
}): Promise<IDiscussionBoardMember.IPasswordChanged> {
  const member = await MyGlobal.prisma.discussion_board_members.findUnique({
    where: { id: props.member.id },
  });

  if (!member) {
    throw new HttpException("Member not found", 404);
  }

  const isCurrentPasswordValid = await PasswordUtil.verify(
    props.body.currentPassword,
    member.password,
  );

  if (!isCurrentPasswordValid) {
    throw new HttpException("Current password is incorrect", 401);
  }

  const newPasswordHash = await PasswordUtil.hash(props.body.newPassword);

  await MyGlobal.prisma.discussion_board_members.update({
    where: { id: props.member.id },
    data: {
      password: newPasswordHash,
      updated_at: new Date(),
    },
  });

  await MyGlobal.prisma.discussion_board_member_sessions.updateMany({
    where: {
      discussion_board_member_id: props.member.id,
      id: { not: props.member.session_id },
      expired_at: null,
    },
    data: {
      expired_at: new Date(),
    },
  });

  return {
    message:
      "Password has been changed successfully. All other sessions have been invalidated.",
  };
}
