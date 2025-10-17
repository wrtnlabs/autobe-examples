import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPortalModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalModerator";

export async function postAuthModeratorPasswordReset(props: {
  body: ICommunityPortalModerator.IResetPassword;
}): Promise<ICommunityPortalModerator.IResetPasswordResponse> {
  const { body } = props;

  const secret = MyGlobal.env.JWT_SECRET_KEY;
  if (!secret)
    throw new HttpException(
      "Server misconfiguration: reset secret missing",
      500,
    );

  // Verify token and extract payload
  let payload: unknown;
  try {
    payload = jwt.verify(body.resetToken, secret);
  } catch (_err) {
    throw new HttpException("Invalid or expired reset token", 401);
  }

  const userId =
    payload &&
    typeof payload === "object" &&
    payload !== null &&
    "userId" in payload
      ? (payload as Record<string, unknown>).userId
      : undefined;

  if (!userId || typeof userId !== "string")
    throw new HttpException("Invalid or expired reset token", 401);

  // Load user record
  const user = await MyGlobal.prisma.community_portal_users.findUnique({
    where: { id: userId },
  });
  if (!user) throw new HttpException("Invalid or expired reset token", 401);

  // Account state checks
  if (user.deleted_at) throw new HttpException("Account has been deleted", 401);

  const member = await MyGlobal.prisma.community_portal_members.findUnique({
    where: { user_id: user.id },
  });
  if (member && member.is_suspended)
    throw new HttpException("Account suspended", 403);

  // Hash and persist new password
  const newHash = await PasswordUtil.hash(body.newPassword);

  await MyGlobal.prisma.community_portal_users.update({
    where: { id: user.id },
    data: {
      password_hash: newHash,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    success: true,
    message:
      "Password has been reset successfully. Please sign in with your new password.",
  };
}
