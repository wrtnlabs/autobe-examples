import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
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

export async function postCommunityPlatformAuthGuestRefresh(props: {
  body: ICommunityPlatformGuest.IRefresh;
}): Promise<ICommunityPlatformGuest.IAuthorized> {
  // Verify refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: string;
    created_at: string;
  };
  try {
    decoded = jwt.verify(props.body.refresh, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as {
      id: string;
      session_id: string;
      type: string;
      created_at: string;
    };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // Validate token type
  if (decoded.type !== "guest") {
    throw new HttpException("Invalid token type", 403);
  }
  // Validate session exists and hasn't expired
  const now = new Date().toISOString();
  const session =
    await MyGlobal.prisma.community_platform_guest_sessions.findFirst({
      where: {
        id: decoded.session_id,
        guest: {
          id: decoded.id,
        },
        expired_at: {
          gt: new Date(now),
        },
      },
      include: {
        guest: true,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // Optional session metadata update
  const updateData: any = {};
  if (props.body.ip !== undefined) updateData.ip = props.body.ip;
  if (props.body.href !== undefined) updateData.href = props.body.href;
  if (props.body.referrer !== undefined)
    updateData.referrer = props.body.referrer;
  // Update session expiration and metadata
  const newExpiredAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await MyGlobal.prisma.community_platform_guest_sessions.update({
    where: { id: decoded.session_id },
    data: {
      ...updateData,
      expired_at: newExpiredAt,
    },
  });
  // Generate new tokens
  const token = {
    access: jwt.sign(
      {
        type: "guest",
        id: decoded.id,
        session_id: decoded.session_id,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "guest",
        id: decoded.id,
        session_id: decoded.session_id,
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "30d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(newExpiredAt),
  };
  return {
    id: decoded.id as string & tags.Format<"uuid">,
    token: {
      access: token.access,
      refresh: token.refresh,
      expired_at: token.expired_at as string & tags.Format<"date-time">,
      refreshable_until: token.refreshable_until as string &
        tags.Format<"date-time">,
    },
  };
}
