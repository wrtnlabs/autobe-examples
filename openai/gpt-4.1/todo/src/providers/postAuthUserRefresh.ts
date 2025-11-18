import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postAuthUserRefresh(props: {
  user: UserPayload;
  body: ITodoUser.IRefresh;
}): Promise<ITodoUser.IAuthorized> {
  // Step 1: Decode and verify submitted refresh token
  let decoded: { id: string; session_id: string; type: "user" };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as { id: string; session_id: string; type: "user" };
  } catch (_) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  // Step 2: Sanity checks
  if (decoded.type !== "user") {
    throw new HttpException("Invalid token type", 403);
  }

  // Step 3: Validate active session (non-expired/non-revoked, matches user, session)
  const oldSession = await MyGlobal.prisma.todo_user_sessions.findFirst({
    where: {
      id: decoded.session_id,
      todo_user_id: decoded.id,
      expired_at: null,
      user: { id: decoded.id },
    },
    include: {
      user: true,
    },
  });
  if (!oldSession) {
    throw new HttpException("Session expired, revoked, or user not found", 401);
  }

  // Audit: user
  const user = oldSession.user;
  if (!user) {
    throw new HttpException("User not found", 401);
  }

  // Step 4: Mark previous session as closed (revoked/expired)
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.todo_user_sessions.update({
    where: { id: oldSession.id },
    data: { expired_at: now },
  });

  // Step 5: Insert new session record with current context
  const newSessionId = v4();
  // Always provide a string for ip (empty string if not present)
  const ipVal =
    props.body.ip !== null && props.body.ip !== undefined
      ? (props.body.ip satisfies string as string)
      : "";
  const newSession = await MyGlobal.prisma.todo_user_sessions.create({
    data: {
      id: newSessionId,
      todo_user_id: user.id,
      ip: ipVal,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: null,
    },
  });

  // Step 6: Generate tokens with exact string/datetime/uuid usage
  const accessExpire = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpire = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const payload = {
    type: "user",
    id: user.id,
    session_id: newSession.id,
    created_at: now,
  };
  const accessToken = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refreshToken = jwt.sign(
    { ...payload, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  // Step 7: Construct DTO output
  return {
    id: user.id,
    email: user.email,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpire,
      refreshable_until: refreshExpire,
    },
  };
}
