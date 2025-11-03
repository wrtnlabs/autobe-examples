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
  // Step 1: Verify and decode the refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: string;
  };

  try {
    decoded = jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as {
      id: string;
      session_id: string;
      type: string;
    };
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  // Step 2: Validate type matches expected actor type
  if (decoded.type !== "admin") {
    throw new HttpException("Invalid token type", 403);
  }

  // Step 3: Validate session exists and is active
  const session = await MyGlobal.prisma.todo_list_admin_sessions.findFirst({
    where: {
      id: decoded.session_id,
      todo_list_admin_id: decoded.id,
    },
    include: {
      admin: true,
    },
  });

  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }

  // Step 4: Verify admin account is active
  if (session.admin.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }

  // Step 5: Generate new tokens with SAME session_id
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const accessToken = jwt.sign(
    {
      type: "admin",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      type: "admin",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Step 6: Update session expiration time
  await MyGlobal.prisma.todo_list_admin_sessions.update({
    where: {
      id: decoded.session_id,
    },
    data: {
      expired_at: refreshExpires,
    },
  });

  // Step 7: Return admin info with new tokens
  return {
    id: session.admin.id,
    email: session.admin.email,
    created_at: toISOStringSafe(session.admin.created_at),
    updated_at: toISOStringSafe(session.admin.updated_at),
    deleted_at: session.admin.deleted_at
      ? toISOStringSafe(session.admin.deleted_at)
      : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
