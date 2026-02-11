import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ICommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityGuest";
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

export async function postCommunityAuthGuestRefresh(props: {
  body: ICommunityGuest.IRefresh;
}): Promise<ICommunityGuest.IAuthorized> {
  // 1. Verify refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: "guest";
  };
  try {
    decoded = jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as typeof decoded;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type
  if (decoded.type !== "guest") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Validate session
  const session = await MyGlobal.prisma.community_guest_sessions.findFirst({
    where: {
      id: decoded.session_id,
    },
  });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Generate new tokens
  const now = new Date();
  const accessExpires = new Date(Date.now() + 15 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const expiredAt = toISOStringSafe(accessExpires);
  const refreshableUntil = toISOStringSafe(refreshExpires);
  const token = {
    access: jwt.sign(
      {
        type: "guest",
        id: decoded.id,
        session_id: decoded.session_id,
        created_at: now.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "15m", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "guest",
        id: decoded.id,
        session_id: decoded.session_id,
        tokenType: "refresh",
        created_at: now.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: expiredAt,
    refreshable_until: refreshableUntil,
  };
  // 5. Update session expiration
  await MyGlobal.prisma.community_guest_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshableUntil },
  });
  return {
    id: decoded.id,
    token: {
      access: token.access,
      refresh: token.refresh,
      expired_at: token.expired_at,
      refreshable_until: token.refreshable_until,
    },
  };
}
