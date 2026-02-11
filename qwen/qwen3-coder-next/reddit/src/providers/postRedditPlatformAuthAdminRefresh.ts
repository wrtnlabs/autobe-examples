import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformAuthAdminRefresh(props: {
  body: IRedditPlatformAdmin.IRefresh;
}): Promise<IRedditPlatformAdmin.IAuthorized> {
  // 1. Verify refresh token signature and expiration
  let decoded: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "admin";
  };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as typeof decoded;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate type
  if (decoded.type !== "admin") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Validate session exists and not revoked
  const session =
    await MyGlobal.prisma.reddit_platform_admin_sessions.findFirst({
      where: {
        refresh_token: props.body.refresh_token,
        admin_id: decoded.id,
        is_revoked: false,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Validate admin not deleted
  const admin = await MyGlobal.prisma.reddit_platform_admins.findUniqueOrThrow({
    where: { id: decoded.id },
  });
  if (admin.deleted_at !== null) {
    throw new HttpException("Admin account has been deleted", 403);
  }
  // 5. Generate new access token (same session_id)
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const newAccessToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  // 6. Update session's last_used_at timestamp
  await MyGlobal.prisma.reddit_platform_admin_sessions.update({
    where: { id: session.id },
    data: { last_used_at: toISOStringSafe(new Date()) },
  });
  // 7. Return new tokens and admin details
  return {
    id: admin.id,
    email: admin.email,
    username: admin.username,
    displayName: admin.display_name === null ? undefined : admin.display_name,
    bio: admin.bio === null ? undefined : admin.bio,
    avatarUrl: admin.avatar_url === null ? undefined : admin.avatar_url,
    karmaScore: admin.karma_score,
    createdAt: toISOStringSafe(admin.created_at),
    updatedAt:
      admin.updated_at === null ? undefined : toISOStringSafe(admin.updated_at),
    deletedAt:
      admin.deleted_at === null ? undefined : toISOStringSafe(admin.deleted_at),
    token: {
      access: newAccessToken,
      refresh: props.body.refresh_token,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(session.expired_at),
    },
  };
}
