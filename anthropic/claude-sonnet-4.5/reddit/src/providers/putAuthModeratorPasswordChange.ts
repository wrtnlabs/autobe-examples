import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function putAuthModeratorPasswordChange(props: {
  moderator: ModeratorPayload;
  body: IRedditLikeModerator.IPasswordChange;
}): Promise<IRedditLikeModerator.IPasswordChangeConfirmation> {
  const { moderator, body } = props;

  // Validate password confirmation matches new password
  if (body.new_password !== body.new_password_confirmation) {
    throw new HttpException(
      "Password confirmation does not match. Please ensure both passwords are identical.",
      400,
    );
  }

  // Fetch moderator record
  const moderatorRecord =
    await MyGlobal.prisma.reddit_like_moderators.findFirst({
      where: {
        id: moderator.id,
        deleted_at: null,
      },
    });

  if (!moderatorRecord) {
    throw new HttpException("Moderator account not found", 404);
  }

  // Verify current password
  const isCurrentPasswordValid = await PasswordUtil.verify(
    body.current_password,
    moderatorRecord.password_hash,
  );

  if (!isCurrentPasswordValid) {
    throw new HttpException("Current password is incorrect", 401);
  }

  // Hash new password
  const newPasswordHash = await PasswordUtil.hash(body.new_password);

  // Update password in database
  await MyGlobal.prisma.reddit_like_moderators.update({
    where: { id: moderator.id },
    data: {
      password_hash: newPasswordHash,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    success: true,
    message:
      "Password changed successfully. A notification email has been sent to your account.",
  };
}
