import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAuthUserRefresh(props: {
  body: ICommunityPlatformUser.IRefresh;
}): Promise<ICommunityPlatformUser.IAuthorized> {
  // Define JWT payload interface
  interface JwtPayload {
    id: string;
    session_id: string;
    type: string;
    created_at: string;
    tokenType?: string;
  }
  // 1. Verify refresh token
  let decoded: JwtPayload;
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      {
        issuer: "autobe",
      },
    ) as JwtPayload;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type
  if (decoded.type !== "user") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Find session by refresh token
  const session =
    await MyGlobal.prisma.community_platform_user_sessions.findFirst({
      where: {
        refresh_token: props.body.refresh_token,
        id: decoded.session_id,
        community_platform_user_id: decoded.id,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Check session expiration using ISO string comparison
  const currentTime = new Date().toISOString();
  if (session.expired_at.toISOString() <= currentTime) {
    throw new HttpException("Session expired", 401);
  }
  // 5. Verify user account
  const user = await MyGlobal.prisma.community_platform_users.findUniqueOrThrow(
    {
      where: { id: decoded.id },
    },
  );
  if (user.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 6. Generate new tokens with ISO string timestamps
  const currentTimeISO = new Date().toISOString();
  const accessExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  const refreshExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  const newAccessToken = jwt.sign(
    {
      type: "user",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: currentTimeISO,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  );
  const newRefreshToken = jwt.sign(
    {
      type: "user",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: currentTimeISO,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "30d", issuer: "autobe" },
  );
  // 7. Update session with new tokens
  await MyGlobal.prisma.community_platform_user_sessions.update({
    where: { id: decoded.session_id },
    data: {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      expired_at: refreshExpires,
    },
  });
  // 8. Return user info with new tokens
  return {
    id: user.id as string & tags.Format<"uuid">,
    username: user.username,
    display_name: user.display_name,
    bio: user.bio,
    avatar_url: user.avatar_url
      ? (user.avatar_url as string & tags.Format<"uri">)
      : null,
    karma: user.karma,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : null,
    email: user.email as string & tags.Format<"email">,
    email_verified: user.email_verified,
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
