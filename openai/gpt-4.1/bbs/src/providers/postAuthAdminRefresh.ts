import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthAdminRefresh(props: {
  body: IDiscussionBoardAdmin.IRefresh;
}): Promise<IDiscussionBoardAdmin.IAuthorized> {
  let decodedToken: { id: string; session_id: string; type: string };
  try {
    decodedToken = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as { id: string; session_id: string; type: string };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (decodedToken.type !== "admin") {
    throw new HttpException("Invalid token type for admin refresh", 403);
  }
  const session =
    await MyGlobal.prisma.discussion_board_admin_sessions.findFirst({
      where: {
        id: decodedToken.session_id,
        discussion_board_admin_id: decodedToken.id,
      },
      include: {
        admin: true,
      },
    });
  if (!session) {
    throw new HttpException("Session not found or expired", 401);
  }
  if (session.admin.is_locked) {
    throw new HttpException("Account is locked", 403);
  }
  if (session.admin.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  const nowValue = Date.now();
  const accessExpValue = nowValue + 60 * 60 * 1000;
  const refreshExpValue = nowValue + 7 * 24 * 60 * 60 * 1000;
  const nowIso = toISOStringSafe(new Date(nowValue));
  const accessExpiresIso = toISOStringSafe(new Date(accessExpValue));
  const refreshExpiresIso = toISOStringSafe(new Date(refreshExpValue));
  const jwtPayload = {
    type: "admin",
    id: session.admin.id,
    session_id: session.id,
    created_at: nowIso,
  };
  const access = jwt.sign(jwtPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refresh = jwt.sign(
    { ...jwtPayload, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  await MyGlobal.prisma.discussion_board_admin_sessions.update({
    where: { id: session.id },
    data: { expired_at: new Date(refreshExpValue) },
  });
  return {
    id: session.admin.id,
    email: session.admin.email,
    display_name: session.admin.display_name,
    avatar_url:
      session.admin.avatar_url !== undefined &&
      session.admin.avatar_url !== null
        ? session.admin.avatar_url
        : null,
    is_locked: session.admin.is_locked,
    deleted_at:
      session.admin.deleted_at !== undefined &&
      session.admin.deleted_at !== null
        ? toISOStringSafe(session.admin.deleted_at)
        : null,
    created_at: toISOStringSafe(session.admin.created_at),
    updated_at: toISOStringSafe(session.admin.updated_at),
    token: {
      access,
      refresh,
      expired_at: accessExpiresIso,
      refreshable_until: refreshExpiresIso,
    },
  };
}
