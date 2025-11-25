import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthUserRefresh(props: {
  body: ITodoListUser.IRefresh;
}): Promise<ITodoListUser.IAuthorized> {
  let decoded: { id: string; session_id: string; type: "user" };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as { id: string; session_id: string; type: "user" };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  if (decoded.type !== "user") {
    throw new HttpException("Invalid token type", 403);
  }

  // Check for valid session and user
  const session = await MyGlobal.prisma.todo_list_user_sessions.findFirst({
    where: {
      id: decoded.session_id,
      todo_list_user_id: decoded.id,
    },
    include: {
      user: true,
    },
  });
  if (!session) {
    throw new HttpException("Session not found or revoked", 401);
  }
  // expired_at is null or in the future
  if (
    session.expired_at !== null &&
    new Date(session.expired_at).getTime() <= Date.now()
  ) {
    throw new HttpException("Session has expired", 401);
  }
  const user = session.user;
  if (!user || user.deleted_at !== null) {
    throw new HttpException("User account deleted", 403);
  }
  if (!user.is_active) {
    throw new HttpException("User account is inactive", 403);
  }

  // Generate times in ISO string format (not using Date type in domain)
  const now = new Date();
  const accessExpiresAtStr = toISOStringSafe(
    new Date(now.getTime() + 60 * 60 * 1000),
  );
  const refreshExpiresAtStr = toISOStringSafe(
    new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
  );

  const accessToken = jwt.sign(
    {
      type: "user",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      type: "user",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Update session expiration in DB
  await MyGlobal.prisma.todo_list_user_sessions.update({
    where: { id: decoded.session_id },
    data: {
      expired_at: refreshExpiresAtStr,
    },
  });

  return {
    id: user.id,
    email: user.email,
    display_name: user.display_name,
    is_verified: user.is_verified,
    is_active: user.is_active,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at:
      user.deleted_at === null ? null : toISOStringSafe(user.deleted_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresAtStr,
      refreshable_until: refreshExpiresAtStr,
    },
    user: {
      id: user.id,
      email: user.email,
      display_name: user.display_name,
      is_verified: user.is_verified,
      is_active: user.is_active,
      created_at: toISOStringSafe(user.created_at),
      updated_at: toISOStringSafe(user.updated_at),
      deleted_at:
        user.deleted_at === null ? null : toISOStringSafe(user.deleted_at),
    },
  };
}
