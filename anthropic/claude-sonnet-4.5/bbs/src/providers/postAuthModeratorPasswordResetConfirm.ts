import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function postAuthModeratorPasswordResetConfirm(props: {
  body: IDiscussionBoardModerator.IResetPassword;
}): Promise<void> {
  const now = new Date();

  const resetRequest =
    await MyGlobal.prisma.discussion_board_password_resets.findFirst({
      where: {
        token: props.body.token,
        actor_type: "moderator",
        used_at: null,
        expires_at: {
          gt: now,
        },
      },
    });

  if (!resetRequest) {
    throw new HttpException(
      "Invalid, expired, or already used reset token",
      404,
    );
  }

  const resetOfModerator =
    await MyGlobal.prisma.discussion_board_password_reset_of_moderators.findUnique(
      {
        where: {
          discussion_board_password_reset_id: resetRequest.id,
        },
      },
    );

  if (!resetOfModerator) {
    throw new HttpException("Reset request not associated with moderator", 404);
  }

  const moderator =
    await MyGlobal.prisma.discussion_board_moderators.findUnique({
      where: {
        id: resetOfModerator.discussion_board_moderator_id,
      },
    });

  if (!moderator || !moderator.is_active || moderator.deleted_at !== null) {
    throw new HttpException("Moderator account not found or inactive", 404);
  }

  const hashedPassword = await PasswordUtil.hash(props.body.password);

  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.discussion_board_moderators.update({
      where: {
        id: moderator.id,
      },
      data: {
        password: hashedPassword,
        updated_at: now,
      },
    }),
    MyGlobal.prisma.discussion_board_password_resets.update({
      where: {
        id: resetRequest.id,
      },
      data: {
        used_at: now,
      },
    }),
  ]);
}
