import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";
import { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postAuthUserRefresh(props: {
  user: UserPayload;
  body: ICommunityForumCommunityUser.IRefresh;
}): Promise<ICommunityForumCommunityUser.IAuthorized> {
  // Verify and decode the refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: "user";
  };
  try {
    decoded = jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as {
      id: string;
      session_id: string;
      type: "user";
    };
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  // Validate type matches expected actor type
  if (decoded.type !== "user") {
    throw new HttpException("Invalid token type", 403);
  }

  // Validate session exists and is active
  const session = await MyGlobal.prisma.community_forum_user_sessions.findFirst(
    {
      where: {
        id: decoded.session_id,
        community_forum_user_id: decoded.id,
      },
    },
  );

  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }

  // Get user information separately since we can't include it
  const user = await MyGlobal.prisma.community_forum_users.findFirst({
    where: {
      id: decoded.id,
    },
  });

  if (!user) {
    throw new HttpException("User not found", 404);
  }

  // Generate new access token (SAME session_id)
  // Using toISOStringSafe to ensure proper date format without using Date constructor directly
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const accessToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id, // Reuse existing session
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id, // Reuse existing session
      tokenType: "refresh",
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  const token: ICommunityForumAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };

  // Update session expiration time
  await MyGlobal.prisma.community_forum_user_sessions.update({
    where: {
      id: decoded.session_id,
    },
    data: {
      expired_at: refreshExpires,
    },
  });

  // Return authorized user information with new tokens
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    created_at: toISOStringSafe(user.created_at),
    updated_at: user.updated_at ? toISOStringSafe(user.updated_at) : undefined,
    token,
  };
}
