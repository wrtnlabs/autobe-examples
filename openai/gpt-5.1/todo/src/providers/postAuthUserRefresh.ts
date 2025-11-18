import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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
  let decoded: { session_id: string; id: string; type: string } | null = null;
  try {
    const value = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    );
    if (
      typeof value === "object" &&
      value !== null &&
      typeof value.session_id === "string" &&
      typeof value.id === "string" &&
      typeof value.type === "string"
    ) {
      decoded = {
        session_id: value.session_id,
        id: value.id,
        type: value.type,
      };
    }
  } catch (_) {
    // Swallow decode errors
  }
  if (!decoded || decoded.type !== "user") {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  const session = await MyGlobal.prisma.todo_list_user_sessions.findFirst({
    where: {
      id: decoded.session_id,
      todo_list_user_id: decoded.id,
    },
    include: { user: true },
  });
  const user = session && session.user;
  if (
    !session ||
    !user ||
    (typeof user.deleted_at === "string" &&
      user.deleted_at !== null &&
      user.deleted_at !== undefined)
  ) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  const now = toISOStringSafe(new Date());
  // Fix: Convert session.expired_at to ISO string before comparison, if not null
  const sessionExpiredAtStr =
    session.expired_at === null ? null : toISOStringSafe(session.expired_at);
  if (sessionExpiredAtStr !== null && sessionExpiredAtStr < now) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  const nowString = now;
  const accessExpires = toISOStringSafe(new Date(Date.now() + 1000 * 60 * 60));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
  );
  const payload = {
    type: "user",
    id: decoded.id,
    session_id: decoded.session_id,
    created_at: nowString,
  };
  const access = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refresh = jwt.sign(
    {
      ...payload,
      tokenType: "refresh",
      created_at: nowString,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  await MyGlobal.prisma.todo_list_user_sessions.update({
    where: {
      id: decoded.session_id,
    },
    data: {
      expired_at: refreshExpires,
    },
  });
  return {
    id: user.id,
    email: user.email,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at:
      user.deleted_at === null || user.deleted_at === undefined
        ? undefined
        : toISOStringSafe(user.deleted_at),
    token: {
      access,
      refresh,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
}
