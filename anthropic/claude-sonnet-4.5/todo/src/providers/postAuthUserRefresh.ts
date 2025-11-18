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
  // 1. Verify and decode refresh token
  let decoded: { id: string; session_id: string; type: "user" };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as { id: string; session_id: string; type: "user" };
  } catch (err) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  // 2. Validate token type
  if (decoded.type !== "user") {
    throw new HttpException("Invalid token type", 403);
  }

  // 3. Look up active session and user
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
    throw new HttpException("Session expired or revoked", 401);
  }
  if (session.expired_at !== null) {
    throw new HttpException("Session expired or revoked", 401);
  }
  if (!session.user) {
    throw new HttpException("Account information missing for session", 500);
  }
  if (session.user.disabled_at !== null) {
    throw new HttpException("Account has been disabled", 403);
  }

  // 4. Compute new expiration values as string (do not use Date type in any API value)
  const access_expires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000)); // 1 hour from now
  const refresh_expires = toISOStringSafe(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  ); // 30 days from now

  // 5. Generate tokens. Structure must exactly match payload requirements
  const nowISOString = toISOStringSafe(new Date());
  const payload = {
    type: "user",
    id: decoded.id,
    session_id: decoded.session_id,
    created_at: nowISOString,
  };
  const accessToken = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refreshToken = jwt.sign(
    { ...payload, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "30d",
      issuer: "autobe",
    },
  );

  // 6. Update session's expired_at value (this is the session expiration per new refresh token)
  await MyGlobal.prisma.todo_list_user_sessions.update({
    where: { id: decoded.session_id },
    data: {
      expired_at: refresh_expires,
    },
  });

  // 7. Return ITodoListUser.IAuthorized (types: all string, UUID, and date-time as required)
  return {
    id: session.user.id,
    email: session.user.email,
    created_at: toISOStringSafe(session.user.created_at),
    updated_at: toISOStringSafe(session.user.updated_at),
    disabled_at:
      session.user.disabled_at === null
        ? undefined
        : toISOStringSafe(session.user.disabled_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: access_expires,
      refreshable_until: refresh_expires,
    },
  };
}
