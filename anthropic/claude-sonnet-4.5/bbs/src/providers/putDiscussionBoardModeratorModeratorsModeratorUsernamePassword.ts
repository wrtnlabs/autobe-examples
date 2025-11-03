import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function putDiscussionBoardModeratorModeratorsModeratorUsernamePassword(props: {
  moderator: ModeratorPayload;
  moderatorUsername: string;
  body: IDiscussionBoardModerator.IChangePassword;
}): Promise<IDiscussionBoardModerator> {
  const { moderator, moderatorUsername, body } = props;

  const targetModerator =
    await MyGlobal.prisma.discussion_board_moderators.findFirst({
      where: {
        username: moderatorUsername,
        deleted_at: null,
      },
    });

  if (!targetModerator) {
    throw new HttpException("Moderator not found", 404);
  }

  if (targetModerator.id !== moderator.id) {
    throw new HttpException(
      "Unauthorized: You can only change your own password",
      403,
    );
  }

  const isCurrentPasswordValid = await PasswordUtil.verify(
    body.current_password,
    targetModerator.password_hash,
  );

  if (!isCurrentPasswordValid) {
    throw new HttpException("Current password is incorrect", 401);
  }

  const newPassword = body.new_password;

  if (newPassword.length < 8) {
    throw new HttpException(
      "New password must be at least 8 characters long",
      400,
    );
  }

  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasDigit = /[0-9]/.test(newPassword);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(newPassword);

  if (!hasUppercase || !hasLowercase || !hasDigit || !hasSpecialChar) {
    throw new HttpException(
      "New password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character",
      400,
    );
  }

  const isSameAsCurrentPassword = await PasswordUtil.verify(
    newPassword,
    targetModerator.password_hash,
  );

  if (isSameAsCurrentPassword) {
    throw new HttpException(
      "New password must be different from current password",
      400,
    );
  }

  const newPasswordHash = await PasswordUtil.hash(newPassword);
  const now = toISOStringSafe(new Date());

  const updatedModerator =
    await MyGlobal.prisma.discussion_board_moderators.update({
      where: { id: targetModerator.id },
      data: {
        password_hash: newPasswordHash,
        updated_at: now,
      },
    });

  await MyGlobal.prisma.discussion_board_moderator_sessions.updateMany({
    where: {
      discussion_board_moderator_id: targetModerator.id,
      expired_at: null,
    },
    data: {
      expired_at: now,
    },
  });

  return {
    id: updatedModerator.id,
    username: updatedModerator.username,
    email: updatedModerator.email,
    password_hash: updatedModerator.password_hash,
    display_name: updatedModerator.display_name ?? undefined,
    bio: updatedModerator.bio ?? undefined,
    location: updatedModerator.location ?? undefined,
    website_url: updatedModerator.website_url ?? undefined,
    profile_picture_url: updatedModerator.profile_picture_url ?? undefined,
    email_verified: updatedModerator.email_verified,
    status: updatedModerator.status,
    moderation_permissions: updatedModerator.moderation_permissions,
    profile_visibility: updatedModerator.profile_visibility,
    activity_visibility: updatedModerator.activity_visibility,
    last_login_at: updatedModerator.last_login_at
      ? toISOStringSafe(updatedModerator.last_login_at)
      : undefined,
    created_at: toISOStringSafe(updatedModerator.created_at),
    updated_at: now,
    deleted_at: updatedModerator.deleted_at
      ? toISOStringSafe(updatedModerator.deleted_at)
      : undefined,
  };
}
