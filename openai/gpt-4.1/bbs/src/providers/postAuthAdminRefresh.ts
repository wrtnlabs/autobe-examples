import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";

export async function postAuthAdminRefresh(props: {
  body: IDiscussionBoardAdmin.IRefresh;
}): Promise<IDiscussionBoardAdmin.IAuthorized> {
  let decoded: { id: string; session_id: string; type: "admin" };
  try {
    decoded = jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as { id: string; session_id: string; type: "admin" };
  } catch (err) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  if (decoded.type !== "admin") {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  const session =
    await MyGlobal.prisma.discussion_board_admin_sessions.findFirst({
      where: {
        id: decoded.session_id,
        discussion_board_admin_id: decoded.id,
      },
      include: {
        admin: true,
      },
    });

  const nowEpoch = Date.now();
  if (
    !session ||
    (session.expired_at && session.expired_at.getTime() <= nowEpoch)
  ) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  const admin = session.admin;
  if (
    !admin ||
    !admin.is_active ||
    admin.is_blocked ||
    admin.deleted_at !== null
  ) {
    throw new HttpException("Account unavailable for refresh", 403);
  }

  const accessExpiresEpoch = nowEpoch + 60 * 60 * 1000;
  const refreshExpiresEpoch = nowEpoch + 7 * 24 * 60 * 60 * 1000;

  const token = {
    access: jwt.sign(
      {
        type: "admin",
        id: decoded.id,
        session_id: decoded.session_id,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "admin",
        id: decoded.id,
        session_id: decoded.session_id,
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: toISOStringSafe(new Date(accessExpiresEpoch)),
    refreshable_until: toISOStringSafe(new Date(refreshExpiresEpoch)),
  };

  await MyGlobal.prisma.discussion_board_admin_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: new Date(refreshExpiresEpoch) },
  });

  return {
    id: admin.id,
    email: admin.email,
    is_email_verified: admin.is_email_verified,
    is_active: admin.is_active,
    is_blocked: admin.is_blocked,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at:
      admin.deleted_at === null ? undefined : toISOStringSafe(admin.deleted_at),
    token,
  };
}
