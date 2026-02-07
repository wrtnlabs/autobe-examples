import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUserPasswordReset";
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

export async function patchRedditPlatformUserPasswordResets(props: {
  user: UserPayload;
  body: IRedditPlatformUserPasswordReset;
}): Promise<IRedditPlatformUserPasswordReset> {
  // Generate a new password reset token
  const token = v4();
  // Calculate expiration time (24 hours from now)
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);
  // Store the password reset request in the database
  // Since we don't have specific user identification in the request body,
  // we'll use the authenticated user's information
  const resetRecord =
    await MyGlobal.prisma.reddit_platform_user_password_resets.create({
      data: {
        id: v4(),
        user_id: props.user.id,
        token: token,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
      },
      select: {
        id: true,
        user_id: true,
        token: true,
        expires_at: true,
        created_at: true,
      },
    });
  // Return the password reset confirmation
  return {
    token: resetRecord.token,
    expires_at: resetRecord.expires_at,
    created_at: resetRecord.created_at,
  };
}
