import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";

export async function postAuthMemberPasswordResetRequest(props: {
  body: IRedditLikeMember.IRequestPasswordReset;
}): Promise<IRedditLikeMember.IPasswordResetRequested> {
  const { body } = props;

  const genericResponse: IRedditLikeMember.IPasswordResetRequested = {
    success: true,
    message:
      "If that email address is registered, you will receive a password reset link.",
  };

  try {
    const user = await MyGlobal.prisma.reddit_like_users.findFirst({
      where: {
        email: body.email,
        role: "member",
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      return genericResponse;
    }

    const resetToken = v4() as string & tags.Format<"uuid">;
    const nowTimestamp = Date.now();
    const expiresAtTimestamp = nowTimestamp + 60 * 60 * 1000;

    const createdAt = toISOStringSafe(new Date(nowTimestamp));
    const expiresAt = toISOStringSafe(new Date(expiresAtTimestamp));

    await MyGlobal.prisma.reddit_like_password_resets.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        reddit_like_user_id: user.id,
        email: body.email,
        reset_token: resetToken,
        expires_at: expiresAt,
        used_at: null,
        created_at: createdAt,
      },
    });

    return genericResponse;
  } catch (error) {
    console.error("Password reset request error:", error);
    return genericResponse;
  }
}
