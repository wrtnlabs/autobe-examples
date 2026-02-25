import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditAuthGuestRefresh(props: {
  body: IRedditGuest.IRefresh;
}): Promise<IRedditGuest.IAuthorized> {
  const refreshToken = (
    props.body as {
      refreshToken: string;
    }
  ).refreshToken;
  let decoded: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "guest";
  };
  try {
    decoded = jwt.verify(refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as typeof decoded;
    try {
    } catch {
      throw new HttpException("Invalid or expired refresh token", 401);
    }
    const session = await MyGlobal.prisma.reddit_guest_sessions.findUnique({
      where: { id: decoded.session_id },
    });
    if (!session || session.expired_at <= new Date()) {
      throw new HttpException("Session expired or revoked", 401);
    }
    const accessExpires = new Date(Date.now() + 30 * 60 * 1000);
    const refreshExpires = new Date(Date.now() + 30 * 60 * 1000);
    const token = {
      access: jwt.sign(
        {
          type: "guest",
          id: decoded.id,
          session_id: decoded.session_id,
          created_at: accessExpires.toISOString(),
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "30m", issuer: "autobe" },
      ),
      refresh: jwt.sign(
        {
          type: "guest",
          id: decoded.id,
          session_id: decoded.session_id,
          tokenType: "refresh",
          created_at: refreshExpires.toISOString(),
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "30m", issuer: "autobe" },
      ),
      expired_at: accessExpires.toISOString(),
      refreshable_until: refreshExpires.toISOString(),
    };
    await MyGlobal.prisma.reddit_guest_sessions.update({
      where: { id: decoded.session_id },
      data: { expired_at: refreshExpires.toISOString() },
    });
    return {
      access: token.access,
      refresh: token.refresh,
      expired_at: token.expired_at,
      token: {
        access: token.access,
        refresh: token.refresh,
        expired_at: token.expired_at,
        refreshable_until: token.refreshable_until,
      },
    };
  } finally {
  }
}
