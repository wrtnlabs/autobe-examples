import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthAdminRefresh(props: {
  body: ITodoAppAdmin.IRefresh;
}): Promise<ITodoAppAdmin.IAuthorized> {
  let decoded: Record<string, unknown>;

  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as Record<string, unknown>;
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  const adminId = String(decoded.id);
  const sessionId = String(decoded.session_id);
  const tokenType = String(decoded.type);

  if (tokenType !== "admin") {
    throw new HttpException("Invalid token type", 403);
  }

  const session = await MyGlobal.prisma.todo_app_admin_session.findFirst({
    where: {
      id: sessionId,
      admin_id: adminId,
    },
    include: {
      admin: true,
    },
  });

  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }

  if (session.admin.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }

  const now = Date.now();
  const accessExpiresMs = now + 60 * 60 * 1000;
  const refreshExpiresMs = now + 7 * 24 * 60 * 60 * 1000;
  const accessExpiresDate = new Date(accessExpiresMs);
  const refreshExpiresDate = new Date(refreshExpiresMs);

  const accessToken = jwt.sign(
    {
      type: tokenType,
      id: adminId,
      session_id: sessionId,
      created_at: new Date(now).toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      type: tokenType,
      id: adminId,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: new Date(now).toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  await MyGlobal.prisma.todo_app_admin_session.update({
    where: {
      id: sessionId,
    },
    data: {
      expired_at: refreshExpiresDate,
    },
  });

  return {
    id: session.admin.id,
    email: session.admin.email,
    created_at: toISOStringSafe(session.admin.created_at),
    updated_at: toISOStringSafe(session.admin.updated_at),
    deleted_at:
      session.admin.deleted_at === null
        ? undefined
        : toISOStringSafe(session.admin.deleted_at),
    last_active_at:
      session.admin.last_active_at === null
        ? undefined
        : toISOStringSafe(session.admin.last_active_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpiresDate),
      refreshable_until: toISOStringSafe(refreshExpiresDate),
    },
  };
}
