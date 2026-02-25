import { ICommunityPlatformUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformUserPasswordResets(props: {
  user: UserPayload;
  body: ICommunityPlatformUserPasswordReset.IUpdate;
}): Promise<void> {
  const { body } = props;
  // Verify the existence of the reset token
  const resetTokenRecord =
    await MyGlobal.prisma.community_platform_user_password_resets.findUnique({
      where: { token: body.token },
      select: {
        token: true,
        expires_at: true,
        used: true,
        community_platform_user_id: true,
      },
    });
  if (!resetTokenRecord) {
    throw new HttpException("Invalid password reset token", 400);
  }
  if (resetTokenRecord.used) {
    throw new HttpException("Password reset token has already been used", 400);
  }
  // Convert expires_at Date to string with tags.Format<'date-time'> using toISOStringSafe
  const expiresAtISO = toISOStringSafe(resetTokenRecord.expires_at);
  // Current time in string format with tags.Format<'date-time'> using toISOStringSafe
  const nowISO = toISOStringSafe(new Date());
  if (expiresAtISO < nowISO) {
    throw new HttpException("Password reset token has expired", 400);
  }
  // Verify the user exists and is not deleted
  const userRecord = await MyGlobal.prisma.community_platform_users.findUnique({
    where: { id: resetTokenRecord.community_platform_user_id },
    select: { id: true, deleted_at: true },
  });
  if (!userRecord || userRecord.deleted_at !== null) {
    throw new HttpException("User not found or deleted", 404);
  }
  // Extract the new password safely with unknown cast to bypass TypeScript error
  const newPassword = (
    body as unknown as {
      newPassword: string;
    }
  ).newPassword;
  // Validate new password (length >=8, includes uppercase, lowercase, digit)
  if (
    typeof newPassword !== "string" ||
    newPassword.length < 8 ||
    !/[A-Z]/.test(newPassword) ||
    !/[a-z]/.test(newPassword) ||
    !/[0-9]/.test(newPassword)
  ) {
    throw new HttpException(
      "Password does not meet strength requirements",
      400,
    );
  }
  // Hash the new password
  const hashedPassword = await PasswordUtil.hash(newPassword);
  // Transactionally update the user password and mark token as used
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.community_platform_users.update({
      where: { id: userRecord.id },
      data: { password: hashedPassword } as any,
    });
    await tx.community_platform_user_password_resets.update({
      where: { token: resetTokenRecord.token },
      data: { used: true },
    });
  });
}
