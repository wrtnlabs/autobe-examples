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
  let decoded;
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    );
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (!decoded || typeof decoded === "string" || decoded.type !== "user") {
    throw new HttpException("Invalid token type", 403);
  }
  const session = await MyGlobal.prisma.todo_list_user_sessions.findFirst({
    where: { id: decoded.session_id, todo_list_user_id: decoded.id },
    include: { user: true },
  });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const user = session.user;
  if (
    user.deleted_at !== null ||
    user.locked === true ||
    user.is_verified === false
  ) {
    throw new HttpException("Account not active or verified", 403);
  }
  if (
    session.expired_at &&
    Date.parse(toISOStringSafe(session.expired_at)) < Date.now()
  ) {
    throw new HttpException("Session has expired", 401);
  }
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const token = {
    access: jwt.sign(
      {
        type: decoded.type,
        id: decoded.id,
        session_id: decoded.session_id,
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: decoded.type,
        id: decoded.id,
        session_id: decoded.session_id,
        tokenType: "refresh",
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  await MyGlobal.prisma.todo_list_user_sessions.update({
    where: { id: session.id },
    data: { expired_at: refreshExpires },
  });
  return {
    id: user.id,
    email: user.email,
    is_verified: user.is_verified,
    locked: user.locked,
    locked_at: user.locked_at ? toISOStringSafe(user.locked_at) : undefined,
    email_verification_token: user.email_verification_token ?? undefined,
    email_verification_sent_at: user.email_verification_sent_at
      ? toISOStringSafe(user.email_verification_sent_at)
      : undefined,
    reset_password_token: user.reset_password_token ?? undefined,
    reset_password_sent_at: user.reset_password_sent_at
      ? toISOStringSafe(user.reset_password_sent_at)
      : undefined,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : undefined,
    token,
  };
}
