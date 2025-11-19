import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function postAuthModeratorPasswordResetRequest(props: {
  body: IDiscussionBoardModerator.IRequestPasswordReset;
}): Promise<void> {
  const moderator =
    await MyGlobal.prisma.discussion_board_moderators.findUnique({
      where: {
        email: props.body.email,
      },
    });

  if (!moderator || !moderator.is_active || moderator.deleted_at !== null) {
    return;
  }

  const token = require("crypto").randomBytes(32).toString("hex");
  const nowTimestamp = Date.now();
  const expiresAtTimestamp = nowTimestamp + 60 * 60 * 1000;

  const createdAt = toISOStringSafe(new Date(nowTimestamp));
  const expiresAt = toISOStringSafe(new Date(expiresAtTimestamp));
  const resetId = v4() as string & tags.Format<"uuid">;

  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.discussion_board_password_resets.create({
      data: {
        id: resetId,
        actor_type: "moderator",
        token: token,
        email: props.body.email,
        expires_at: expiresAt,
        created_at: createdAt,
      },
    });

    await tx.discussion_board_password_reset_of_moderators.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        discussion_board_password_reset_id: resetId,
        discussion_board_moderator_id: moderator.id,
        created_at: createdAt,
      },
    });
  });
}
