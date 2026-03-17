import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
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

export async function postCommunityPlatformAuthAdminRefresh(props: {
  body: ICommunityPlatformAdmin.IRefresh;
}): Promise<ICommunityPlatformAdmin.IAuthorized> {
  // Validate refresh token
  const refreshToken = props.body.refresh_token;
  // Decode and verify JWT
  let decoded: {
    id: string;
    session_id: string;
    type: string;
    tokenType?: string;
    created_at?: string;
  };
  try {
    const verified = jwt.verify(refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
    if (typeof verified !== "object" || verified === null) {
      throw new HttpException("Invalid token payload", 401);
    }
    decoded = verified as typeof decoded;
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // Verify token type and structure
  if (
    decoded.type !== "admin" ||
    decoded.tokenType !== "refresh" ||
    !decoded.id ||
    !decoded.session_id
  ) {
    throw new HttpException("Invalid token type or structure", 403);
  }
  // Get current time as ISO string
  const now = new Date().toISOString();
  // Find session with token
  const sessionToken =
    await MyGlobal.prisma.community_platform_admin_session_tokens.findFirst({
      where: {
        refresh_token: refreshToken,
        refresh_token_expires_at: { gt: now },
      },
      include: {
        session: {
          select: {
            id: true,
            community_platform_admin_id: true,
            expired_at: true,
          },
        },
      },
    });
  if (!sessionToken || !sessionToken.session) {
    throw new HttpException("Session not found or expired", 401);
  }
  const session = sessionToken.session;
  // Check session expiration
  if (now > session.expired_at.toISOString()) {
    throw new HttpException("Session expired", 401);
  }
  // Verify admin exists and is active
  const admin =
    await MyGlobal.prisma.community_platform_admins.findUniqueOrThrow({
      where: {
        id: session.community_platform_admin_id,
        deleted_at: null,
      },
    });
  // Calculate new expiration dates
  const nowDate = new Date();
  const accessExpiresDate = new Date(nowDate.getTime() + 60 * 60 * 1000); // 1 hour
  const refreshExpiresDate = new Date(
    nowDate.getTime() + 7 * 24 * 60 * 60 * 1000,
  ); // 7 days
  const accessExpires = accessExpiresDate.toISOString();
  const refreshExpires = refreshExpiresDate.toISOString();
  // Generate new tokens
  const newAccessToken = jwt.sign(
    {
      type: "admin",
      id: admin.id,
      session_id: session.id,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const newRefreshToken = jwt.sign(
    {
      type: "admin",
      id: admin.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // Update session tokens
  await MyGlobal.prisma.community_platform_admin_session_tokens.update({
    where: { id: sessionToken.id },
    data: {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      access_token_expires_at: accessExpires,
      refresh_token_expires_at: refreshExpires,
    },
  });
  // Update session expiration
  await MyGlobal.prisma.community_platform_admin_sessions.update({
    where: { id: session.id },
    data: {
      expired_at: refreshExpires,
    },
  });
  // Return response
  return {
    id: admin.id as string & tags.Format<"uuid">,
    email: admin.email,
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: accessExpires as string & tags.Format<"date-time">,
      refreshable_until: refreshExpires as string & tags.Format<"date-time">,
    },
  };
}
