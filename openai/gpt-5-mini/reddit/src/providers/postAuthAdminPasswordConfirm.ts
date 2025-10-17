import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPortalAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalAdmin";

export async function postAuthAdminPasswordConfirm(props: {
  body: ICommunityPortalAdmin.IResetConfirm;
}): Promise<ICommunityPortalAdmin.IResetConfirmResponse> {
  const { body } = props;

  // Expect payload: { token: string, new_password: string }
  // Trust controller-level validation; only business validation for token is performed here
  const token = (body as unknown as { token?: string }).token;
  const newPassword = (body as unknown as { new_password?: string })
    .new_password;

  if (!token || !newPassword) {
    throw new HttpException(
      "Bad Request: token and new_password are required",
      400,
    );
  }

  let verified: unknown;
  try {
    verified = jwt.verify(token, MyGlobal.env.JWT_SECRET_KEY);
  } catch (_err) {
    return {
      success: false,
      message: "Invalid or expired token. Request a new password reset.",
      user_id: null,
      reauthenticate: false,
    };
  }

  // Extract user identifier from token payload (standard claims: user_id or sub)
  let userId: string | undefined;
  if (verified && typeof verified === "object") {
    const v = verified as Record<string, unknown>;
    if (typeof v.user_id === "string") userId = v.user_id;
    else if (typeof v.sub === "string") userId = v.sub;
  }

  if (!userId) {
    return {
      success: false,
      message: "Invalid token payload: no user reference found.",
      user_id: null,
      reauthenticate: false,
    };
  }

  // Ensure user exists
  const user = await MyGlobal.prisma.community_portal_users.findUnique({
    where: { id: userId },
  });
  if (!user) throw new HttpException("Not Found", 404);

  // Hash the new password and update the user record
  const hashed = await PasswordUtil.hash(newPassword);
  const now = toISOStringSafe(new Date());

  try {
    await MyGlobal.prisma.community_portal_users.update({
      where: { id: userId },
      data: {
        password_hash: hashed,
        updated_at: now,
      },
    });
  } catch (err) {
    throw new HttpException("Internal Server Error", 500);
  }

  return {
    success: true,
    message:
      "Password reset successful. Please sign in with your new credentials.",
    user_id: user.id,
    reauthenticate: true,
  };
}
