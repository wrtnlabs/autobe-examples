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

export async function postAuthUserRefresh(props: {
  body: ITodoUser.IRefresh;
}): Promise<ITodoUser.IAuthorized> {
  // 1. Verify and decode the refresh token
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

  // 2. Validate token type - must be 'user'
  if (decoded.type !== "user") {
    throw new HttpException("Invalid token type", 403);
  }

  // 3. Lookup session and user, session must not be expired
  const session = await MyGlobal.prisma.todo_user_sessions.findFirst({
    where: {
      id: decoded.session_id,
      todo_user_id: decoded.id,
    },
    include: {
      todoUser: true,
    },
  });

  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }

  // session.expired_at is null if active; if not null, it's expired
  if (
    session.expired_at !== null &&
    new Date(session.expired_at).getTime() <= Date.now()
  ) {
    throw new HttpException("Session expired", 401);
  }

  // 4. The user must exist and not be soft-deleted
  if (!session.todoUser || session.todoUser.deleted_at !== null) {
    throw new HttpException("Account has been deleted or is inactive", 403);
  }

  // Calculate expiration datetimes as strings
  const now = Date.now();
  const accessExpires = new Date(now + 60 * 60 * 1000);
  const refreshExpires = new Date(now + 7 * 24 * 60 * 60 * 1000);

  // 5. Issue access and refresh tokens -- payload must match original issued tokens
  const token = {
    access: jwt.sign(
      {
        type: "user",
        id: decoded.id,
        session_id: decoded.session_id,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "user",
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
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };

  // 6. Update session expiration in DB
  await MyGlobal.prisma.todo_user_sessions.update({
    where: {
      id: decoded.session_id,
    },
    data: {
      expired_at: toISOStringSafe(refreshExpires),
    },
  });

  // 7. Return user object following ITodoUser.IAuthorized strictly
  return {
    id: session.todoUser.id,
    email: session.todoUser.email,
    created_at: toISOStringSafe(session.todoUser.created_at),
    updated_at: toISOStringSafe(session.todoUser.updated_at),
    deleted_at:
      session.todoUser.deleted_at === null
        ? undefined
        : toISOStringSafe(session.todoUser.deleted_at),
    token,
  };
}
