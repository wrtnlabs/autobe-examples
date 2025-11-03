import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putDiscussionBoardMemberMembersMemberUsernamePassword(props: {
  member: MemberPayload;
  memberUsername: string;
  body: IDiscussionBoardMember.IPasswordUpdate;
}): Promise<IDiscussionBoardMember.IPasswordChange> {
  const { member, memberUsername, body } = props;

  const targetMember = await MyGlobal.prisma.discussion_board_members.findFirst(
    {
      where: {
        username: memberUsername,
        deleted_at: null,
      },
    },
  );

  if (!targetMember) {
    throw new HttpException("Member not found", 404);
  }

  if (targetMember.id !== member.id) {
    throw new HttpException(
      "Unauthorized: You can only update your own password",
      403,
    );
  }

  const isCurrentPasswordValid = await PasswordUtil.verify(
    body.current_password,
    targetMember.password_hash,
  );

  if (!isCurrentPasswordValid) {
    throw new HttpException("Current password is incorrect", 401);
  }

  if (body.new_password !== body.new_password_confirmation) {
    throw new HttpException("New password and confirmation do not match", 400);
  }

  if (body.new_password.length < 8) {
    throw new HttpException("Password must be at least 8 characters long", 400);
  }

  const hasUppercase = /[A-Z]/.test(body.new_password);
  const hasLowercase = /[a-z]/.test(body.new_password);
  const hasDigit = /[0-9]/.test(body.new_password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\\[\\]{}|;:,.<>?]/.test(
    body.new_password,
  );

  if (!hasUppercase || !hasLowercase || !hasDigit || !hasSpecialChar) {
    throw new HttpException(
      "Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character",
      400,
    );
  }

  const isSameAsCurrentPassword = await PasswordUtil.verify(
    body.new_password,
    targetMember.password_hash,
  );

  if (isSameAsCurrentPassword) {
    throw new HttpException(
      "New password must differ from current password",
      400,
    );
  }

  const newPasswordHash = await PasswordUtil.hash(body.new_password);
  const updateTimestamp = new Date();

  const updatedMember = await MyGlobal.prisma.discussion_board_members.update({
    where: { id: targetMember.id },
    data: {
      password_hash: newPasswordHash,
      updated_at: updateTimestamp,
    },
  });

  const allSessions =
    await MyGlobal.prisma.discussion_board_member_sessions.findMany({
      where: {
        discussion_board_member_id: targetMember.id,
        expired_at: null,
      },
    });

  const sessionsToInvalidate = allSessions.filter(
    (session) => session.id !== member.session_id,
  );

  const sessionsInvalidatedCount = sessionsToInvalidate.length;

  if (sessionsInvalidatedCount > 0) {
    await MyGlobal.prisma.discussion_board_member_sessions.updateMany({
      where: {
        id: {
          in: sessionsToInvalidate.map((s) => s.id),
        },
      },
      data: {
        expired_at: updateTimestamp,
      },
    });
  }

  const accessTokenExpiry = new Date();
  accessTokenExpiry.setMinutes(accessTokenExpiry.getMinutes() + 30);

  const refreshTokenExpiry = new Date();
  refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 14);

  const accessToken = jwt.sign(
    {
      id: updatedMember.id,
      session_id: member.session_id,
      type: "member",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "30m" },
  );

  const refreshToken = jwt.sign(
    {
      id: updatedMember.id,
      session_id: member.session_id,
      type: "member",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "14d" },
  );

  const passwordUpdatedAt = toISOStringSafe(updateTimestamp);
  const updatedAt = toISOStringSafe(updateTimestamp);

  const token = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: toISOStringSafe(accessTokenExpiry),
    refreshable_until: toISOStringSafe(refreshTokenExpiry),
  };

  return {
    id: updatedMember.id as string & tags.Format<"uuid">,
    token: token,
    sessions_invalidated_count: sessionsInvalidatedCount,
    password_updated_at: passwordUpdatedAt,
    updated_at: updatedAt,
  };
}
