import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postAuthModeratorPasswordChange(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardModerator.IChangePassword;
}): Promise<void> {
  const moderator =
    await MyGlobal.prisma.discussion_board_moderators.findUnique({
      where: { id: props.moderator.id },
    });

  if (!moderator) {
    throw new HttpException("Moderator not found", 404);
  }

  if (moderator.deleted_at !== null) {
    throw new HttpException("Moderator account has been deleted", 403);
  }

  if (!moderator.is_active) {
    throw new HttpException("Moderator account is not active", 403);
  }

  const isCurrentPasswordValid = await PasswordUtil.verify(
    props.body.currentPassword,
    moderator.password,
  );

  if (!isCurrentPasswordValid) {
    throw new HttpException("Current password is incorrect", 401);
  }

  const isSamePassword = await PasswordUtil.verify(
    props.body.newPassword,
    moderator.password,
  );

  if (isSamePassword) {
    throw new HttpException(
      "New password must be different from current password",
      400,
    );
  }

  const hashedNewPassword = await PasswordUtil.hash(props.body.newPassword);

  await MyGlobal.prisma.discussion_board_moderators.update({
    where: { id: props.moderator.id },
    data: {
      password: hashedNewPassword,
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
