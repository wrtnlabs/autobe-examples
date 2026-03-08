import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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

export async function postDiscussionBoardAuthAdminRefresh(props: {
  body: IDiscussionBoardAdmin.IRefresh;
}): Promise<IDiscussionBoardAdmin.IAuthorized> {
  // Verify refresh token
  let decoded: {
    id: string;
    session_id: string;
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
  // Validate session exists and is active
  const session =
    await MyGlobal.prisma.discussion_board_admin_sessions.findFirst({
      where: {
        id: decoded.session_id,
        discussion_board_admin_id: decoded.id,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // Check if session is expired by comparing expired_at with current time
  const now = new Date();
  if (new Date(session.expired_at) <= now) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // Validate admin account is not banned
  const admin = await MyGlobal.prisma.discussion_board_admins.findUniqueOrThrow(
    {
      where: { id: decoded.id },
    },
  );
  if (admin.is_banned) {
    throw new HttpException("Admin account is banned", 403);
  }
  // Generate new tokens
  const accessExpires = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes
  const refreshExpires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
  const newAccessToken = jwt.sign(
    {
      type: "admin" as const,
      id: admin.id,
      session_id: session.id,
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  );
  const newRefreshToken = jwt.sign(
    {
      type: "admin" as const,
      id: admin.id,
      session_id: session.id,
      tokenType: "refresh" as const,
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "30d", issuer: "autobe" },
  );
  // Update session with new refresh token
  await MyGlobal.prisma.discussion_board_admin_sessions.update({
    where: { id: session.id },
    data: {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      expired_at: refreshExpires,
      updated_at: now,
    },
  });
  return {
    id: admin.id,
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: accessExpires.toISOString(),
      refreshable_until: refreshExpires.toISOString(),
    },
  };
}
