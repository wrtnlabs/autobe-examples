import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function postAuthMemberPasswordResetComplete(props: {
  body: IDiscussionBoardMember.IResetPassword;
}): Promise<IDiscussionBoardMember.IPasswordResetCompleted> {
  const resetRecord =
    await MyGlobal.prisma.discussion_board_password_resets.findUnique({
      where: { token: props.body.token },
      include: {
        discussion_board_password_reset_of_members: true,
      },
    });

  if (!resetRecord) {
    throw new HttpException("Invalid or expired password reset token.", 400);
  }

  if (resetRecord.actor_type !== "member") {
    throw new HttpException("Invalid password reset token.", 400);
  }

  const currentTime = new Date();
  if (currentTime >= resetRecord.expires_at) {
    throw new HttpException("Password reset token has expired.", 400);
  }

  if (resetRecord.used_at !== null) {
    throw new HttpException("Password reset token has already been used.", 400);
  }

  if (!resetRecord.discussion_board_password_reset_of_members) {
    throw new HttpException(
      "Password reset token is not associated with a member account.",
      404,
    );
  }

  const memberContext = resetRecord.discussion_board_password_reset_of_members;
  const memberId = memberContext.discussion_board_member_id;

  const hashedPassword = await PasswordUtil.hash(props.body.password);

  await MyGlobal.prisma.discussion_board_members.update({
    where: { id: memberId },
    data: {
      password: hashedPassword,
      updated_at: currentTime,
    },
  });

  await MyGlobal.prisma.discussion_board_password_resets.update({
    where: { id: resetRecord.id },
    data: {
      used_at: currentTime,
    },
  });

  await MyGlobal.prisma.discussion_board_member_sessions.updateMany({
    where: {
      discussion_board_member_id: memberId,
      expired_at: null,
    },
    data: {
      expired_at: currentTime,
    },
  });

  return {
    success: true,
    message:
      "Password has been successfully reset. Please login with your new password.",
  };
}
