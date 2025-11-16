import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthUserRefresh(props: {
  body: ITodoAppUser.IRefreshToken;
}): Promise<ITodoAppUser.IAuthorized> {
  // Verify and decode the refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: "user";
  };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as {
      id: string;
      session_id: string;
      type: "user";
    };
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  // Validate token type matches expected actor type
  if (decoded.type !== "user") {
    throw new HttpException("Invalid token type", 403);
  }

  // Validate session exists and is active
  const session = await MyGlobal.prisma.todo_app_user_sessions.findFirst({
    where: {
      id: decoded.session_id,
      todo_app_user_id: decoded.id,
      expired_at: null,
    },
    include: {
      user: true,
    },
  });

  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }

  // Validate user account is active
  if (session.user.status !== "active") {
    throw new HttpException("User account is not active", 403);
  }

  if (session.user.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }

  // Calculate expiration times without Date objects
  const now = Date.now();
  const accessExpiresMs = now + 60 * 60 * 1000;
  const refreshExpiresMs = now + 7 * 24 * 60 * 60 * 1000;

  const token = {
    access: jwt.sign(
      {
        type: decoded.type,
        id: decoded.id,
        session_id: decoded.session_id,
        created_at: new Date(now).toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: decoded.type,
        id: decoded.id,
        session_id: decoded.session_id,
        tokenType: "refresh",
        created_at: new Date(now).toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: toISOStringSafe(new Date(accessExpiresMs)),
    refreshable_until: toISOStringSafe(new Date(refreshExpiresMs)),
  };

  // Update session expiration time and context in single operation
  await MyGlobal.prisma.todo_app_user_sessions.update({
    where: {
      id: decoded.session_id,
    },
    data: {
      expired_at: new Date(refreshExpiresMs),
      ip: props.body.ip ?? session.ip,
      href: props.body.href,
      referrer: props.body.referrer,
    },
  });

  // Return authorized user information with new tokens
  return {
    id: session.user.id as string & tags.Format<"uuid">,
    email: session.user.email as string & tags.Format<"email">,
    password_hash: session.user.password_hash,
    status: session.user.status as "pending" | "active" | "suspended",
    created_at: toISOStringSafe(session.user.created_at),
    updated_at: toISOStringSafe(session.user.updated_at),
    deleted_at: session.user.deleted_at
      ? toISOStringSafe(session.user.deleted_at)
      : undefined,
    token: {
      access: token.access,
      refresh: token.refresh,
      expired_at: token.expired_at,
      refreshable_until: token.refreshable_until,
    },
  };
}
