import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthAdminRefresh(props: {
  body: ITodoListAdmin.IRefresh;
}): Promise<ITodoListAdmin.IAuthorized> {
  let decoded: { id: string; session_id: string; type: "admin" };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as { id: string; session_id: string; type: "admin" };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (decoded.type !== "admin") {
    throw new HttpException("Invalid token type", 403);
  }

  const session = await MyGlobal.prisma.todo_list_admin_sessions.findFirst({
    where: {
      id: decoded.session_id,
      todo_list_admin_id: decoded.id,
    },
    include: { admin: true },
  });
  if (!session) {
    throw new HttpException("Session not found or revoked", 401);
  }
  if (
    session.expired_at &&
    new Date(session.expired_at).getTime() < Date.now()
  ) {
    throw new HttpException("Session expired", 401);
  }
  if (!session.admin || session.admin.is_locked) {
    throw new HttpException("Admin account is locked", 403);
  }

  const access_expires = new Date(Date.now() + 60 * 60 * 1000);
  const refresh_expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const access_token = jwt.sign(
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
  );
  const refresh_token = jwt.sign(
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
  );

  await MyGlobal.prisma.todo_list_admin_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: toISOStringSafe(refresh_expires) },
  });

  return {
    id: session.admin.id,
    email: session.admin.email,
    is_locked: session.admin.is_locked,
    created_at: session.admin.created_at
      ? toISOStringSafe(session.admin.created_at)
      : toISOStringSafe(new Date(0)),
    updated_at: session.admin.updated_at
      ? toISOStringSafe(session.admin.updated_at)
      : toISOStringSafe(new Date(0)),
    token: {
      access: access_token,
      refresh: refresh_token,
      expired_at: toISOStringSafe(access_expires),
      refreshable_until: toISOStringSafe(refresh_expires),
    },
  };
}
