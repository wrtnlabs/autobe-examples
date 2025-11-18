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
  // 1. Decode and verify refresh token
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
  // 2. Verify JWT type
  if (decoded.type !== "user") {
    throw new HttpException("Invalid token type for user flow.", 403);
  }
  // 3. Load matching session with user from DB
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
    throw new HttpException("Session not found.", 401);
  }
  if (
    session.expired_at &&
    new Date(session.expired_at).getTime() <= Date.now()
  ) {
    throw new HttpException("Session expired; login required.", 401);
  }
  if (!session.user) {
    throw new HttpException("User for session not found.", 401);
  }
  // 4. Issue new tokens with same session_id & user id
  const now = new Date();
  const accessExpiresAt = toISOStringSafe(
    new Date(now.getTime() + 60 * 60 * 1000),
  );
  const refreshExpiresAt = toISOStringSafe(
    new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
  );
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "user",
        id: session.todo_list_user_id,
        session_id: session.id,
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
        type: "user",
        id: session.todo_list_user_id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpiresAt,
    refreshable_until: refreshExpiresAt,
  };
  // 5. Update session expiration
  await MyGlobal.prisma.todo_list_user_sessions.update({
    where: { id: session.id },
    data: { expired_at: refreshExpiresAt },
  });
  // 6. Return authorized response
  return {
    id: session.user.id,
    email: session.user.email,
    display_name: session.user.display_name ?? null,
    created_at: toISOStringSafe(session.user.created_at),
    updated_at: toISOStringSafe(session.user.updated_at),
    token,
    user: {
      id: session.user.id,
      email: session.user.email,
      display_name: session.user.display_name ?? null,
      created_at: toISOStringSafe(session.user.created_at),
      updated_at: toISOStringSafe(session.user.updated_at),
    },
  };
}
