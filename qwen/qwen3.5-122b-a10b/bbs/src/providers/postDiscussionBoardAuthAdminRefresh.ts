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
  // 1. Verify refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: "admin";
    created_at: string;
  };
  try {
    decoded = typia.assert<{
      id: string;
      session_id: string;
      type: "admin";
      created_at: string;
    }>(
      jwt.verify(props.body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
        issuer: "autobe",
      }),
    );
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate session exists and is active
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
  // Check if session is expired
  const sessionExpiredAt = new Date(session.expired_at);
  if (sessionExpiredAt < new Date()) {
    throw new HttpException("Session expired", 401);
  }
  // 3. Validate admin account exists and is not deleted
  const admin = await MyGlobal.prisma.discussion_board_admins.findUniqueOrThrow(
    {
      where: { id: decoded.id },
    },
  );
  if (admin.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 4. Generate new tokens with SAME session_id
  const accessExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const newAccessToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "30m", issuer: "autobe" },
  );
  const newRefreshToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 5. Update session expiration
  await MyGlobal.prisma.discussion_board_admin_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpires },
  });
  // 6. Return authorized response
  const result: IDiscussionBoardAdmin.IAuthorized = {
    id: admin.id,
    email: admin.email,
    display_name: admin.display_name,
    bio: admin.bio,
    grade: typia.assert<"regular" | "super">(admin.grade),
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at: null,
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
  return result;
}
