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
  refreshToken: string & tags.MinLength<32>;
  body: ITodoUser.IRefresh;
}): Promise<ITodoUser.IAuthorized> {
  // 1. Verify and decode refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: "user";
  };
  try {
    decoded = jwt.verify(props.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as {
      id: string;
      session_id: string;
      type: "user";
    };
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  // 2. Validate session exists and is active
  const session = await MyGlobal.prisma.todo_user_sessions.findFirst({
    where: {
      id: decoded.session_id,
      todo_user_id: decoded.id,
      expired_at: null, // Session must be active
    },
    include: {
      user: true, // Include user to check for deletion
    },
  });

  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  } else if (session.user.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }

  // 3. Generate new access token (SAME session_id)
  const now = new Date();
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(now.getTime() + 30 * 60 * 1000),
  ); // 30 minutes
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
  ); // 7 days

  const access = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id, // Reuse existing session_id
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "30m",
      issuer: "autobe",
    },
  );

  const refresh = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id, // Reuse existing session_id
      tokenType: "refresh",
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // 4. Update session expiration time to match new refresh token expiration
  await MyGlobal.prisma.todo_user_sessions.update({
    where: {
      id: decoded.session_id,
    },
    data: {
      expired_at: refreshExpires,
    },
  });

  // 5. Return authorized response using session.user data (already loaded)
  return {
    id: session.user.id,
    email: session.user.email,
    created_at: toISOStringSafe(session.user.created_at),
    updated_at: toISOStringSafe(session.user.updated_at),
    deleted_at: typia.assert<string & tags.Format<"date-time">>(
      session.user.deleted_at
        ? toISOStringSafe(session.user.deleted_at)
        : "1970-01-01T00:00:00Z",
    ),
    token: {
      access,
      refresh,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
}
