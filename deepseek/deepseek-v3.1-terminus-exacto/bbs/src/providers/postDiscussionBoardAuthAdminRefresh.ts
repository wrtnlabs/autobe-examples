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
  // Get current timestamp and ISO string
  const now = Date.now();
  const nowISO = toISOStringSafe(new Date(now));
  // Verify refresh token
  let payload: unknown;
  try {
    payload = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    );
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // Validate token payload structure
  if (typeof payload !== "object" || payload === null) {
    throw new HttpException("Invalid token payload", 401);
  }
  const decoded = payload as {
    id?: string;
    session_id?: string;
    type?: string;
    created_at?: string;
  };
  if (
    decoded.type !== "admin" ||
    !decoded.id ||
    !decoded.session_id ||
    !decoded.created_at
  ) {
    throw new HttpException(
      "Invalid token type or missing required fields",
      403,
    );
  }
  // Validate session exists, refresh token matches, and not expired
  const session =
    await MyGlobal.prisma.discussion_board_admin_sessions.findFirst({
      where: {
        id: decoded.session_id,
        refresh_token: props.body.refresh_token,
        expired_at: { gte: nowISO },
      },
    });
  if (!session) {
    throw new HttpException(
      "Session expired, revoked, or invalid refresh token",
      401,
    );
  }
  // Validate administrator account is active
  const admin = await MyGlobal.prisma.discussion_board_admins.findFirst({
    where: {
      id: decoded.id,
      deleted_at: null,
    },
  });
  if (!admin) {
    throw new HttpException("Administrator account not found or deleted", 403);
  }
  // Calculate expiration times
  const accessExpiresISO = toISOStringSafe(new Date(now + 60 * 60 * 1000)); // 1 hour
  const refreshExpiresISO = toISOStringSafe(
    new Date(now + 7 * 24 * 60 * 60 * 1000),
  ); // 7 days
  // Generate new tokens
  const newAccessToken = jwt.sign(
    {
      type: "admin",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: nowISO,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const newRefreshToken = jwt.sign(
    {
      type: "admin",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: nowISO,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // Update session with new tokens and expiration
  await MyGlobal.prisma.discussion_board_admin_sessions.update({
    where: { id: decoded.session_id },
    data: {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      expired_at: refreshExpiresISO,
      last_accessed_at: nowISO,
    },
  });
  // Return authorized response
  return {
    id: admin.id,
    email: admin.email,
    display_name: admin.display_name,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at: admin.deleted_at ? toISOStringSafe(admin.deleted_at) : null,
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: accessExpiresISO,
      refreshable_until: refreshExpiresISO,
    },
  };
}
