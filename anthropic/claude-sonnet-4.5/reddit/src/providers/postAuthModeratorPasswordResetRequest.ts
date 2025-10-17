import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";

export async function postAuthModeratorPasswordResetRequest(props: {
  body: IRedditLikeModerator.IPasswordResetRequest;
}): Promise<IRedditLikeModerator.IPasswordResetResponse> {
  const { body } = props;

  const moderator = await MyGlobal.prisma.reddit_like_users.findFirst({
    where: {
      email: body.email,
      role: "moderator",
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
    },
  });

  if (moderator) {
    const resetToken = v4() as string & tags.Format<"uuid">;
    const now = toISOStringSafe(new Date());
    const expiresAt = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));

    await MyGlobal.prisma.reddit_like_password_resets.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        reddit_like_user_id: moderator.id,
        email: moderator.email,
        reset_token: resetToken,
        expires_at: expiresAt,
        used_at: null,
        created_at: now,
      },
    });
  }

  return {
    success: true,
    message:
      "If a moderator account exists with this email address, a password reset link has been sent.",
  };
}
