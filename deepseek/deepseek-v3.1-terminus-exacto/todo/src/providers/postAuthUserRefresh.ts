import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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
  // Verify and decode refresh token
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

  // Validate token type matches expected
  if (decoded.type !== "user") {
    throw new HttpException("Invalid token type", 403);
  }

  // Validate session exists and is active
  const session = await MyGlobal.prisma.todo_app_user_sessions.findFirst({
    where: {
      id: decoded.session_id,
      todo_app_user_id: decoded.id,
      OR: [{ expired_at: null }, { expired_at: { gt: new Date() } }],
    },
    include: {
      user: true,
    },
  });

  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }

  // Validate user account is not deleted
  if (session.user.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }

  // Generate new tokens with same session_id
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: decoded.type,
        id: decoded.id,
        session_id: decoded.session_id,
        created_at: now.toISOString(),
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
        created_at: now.toISOString(),
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

  // Update session expiration time
  await MyGlobal.prisma.todo_app_user_sessions.update({
    where: {
      id: decoded.session_id,
    },
    data: {
      expired_at: refreshExpires,
      last_activity_at: now,
    },
  });

  // Return user information with new tokens
  return {
    id: session.user.id as string & tags.Format<"uuid">,
    email: session.user.email as string & tags.Format<"email">,
    name: session.user.name,
    status: session.user.status,
    last_login_at: session.user.last_login_at
      ? toISOStringSafe(session.user.last_login_at)
      : undefined,
    created_at: toISOStringSafe(session.user.created_at),
    updated_at: toISOStringSafe(session.user.updated_at),
    token: token,
  };
}
