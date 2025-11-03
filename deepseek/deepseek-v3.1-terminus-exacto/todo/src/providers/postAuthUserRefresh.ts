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
  body: ITodoAppUser.IRefresh;
}): Promise<ITodoAppUser.IAuthorized> {
  // Step 1: Verify and decode refresh token
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

  // Step 2: Validate type matches expected actor type
  if (decoded.type !== "user") {
    throw new HttpException("Invalid token type", 403);
  }

  // Step 3: Validate session exists and is active
  const session = await MyGlobal.prisma.todo_app_user_sessions.findFirst({
    where: {
      id: decoded.session_id,
      todo_app_user_id: decoded.id,
    },
    include: {
      user: true,
    },
  });

  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }

  // Step 4: Validate user account is active
  if (session.user.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }

  // Step 5: Generate new access token (SAME session_id)
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
        created_at: toISOStringSafe(now),
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

  // Step 6: Update session expiration time
  await MyGlobal.prisma.todo_app_user_sessions.update({
    where: {
      id: decoded.session_id,
    },
    data: {
      expired_at: refreshExpires,
    },
  });

  // Step 7: Return user info with new tokens
  return {
    id: session.user.id,
    email: session.user.email,
    status: session.user.status,
    created_at: toISOStringSafe(session.user.created_at),
    updated_at: toISOStringSafe(session.user.updated_at),
    deleted_at: session.user.deleted_at
      ? toISOStringSafe(session.user.deleted_at)
      : undefined,
    token,
  };
}
