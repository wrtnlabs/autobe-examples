import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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
  const { refresh_token } = props.body;
  let decoded;
  try {
    decoded = jwt.verify(refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as { id: string; session_id: string; type: "user" };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (!decoded || decoded.type !== "user") {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  const session = await MyGlobal.prisma.todo_list_user_sessions.findFirst({
    where: {
      id: decoded.session_id,
      todo_list_user_id: decoded.id,
    },
  });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const user = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { id: session.todo_list_user_id },
  });
  if (!user) {
    throw new HttpException("User account not found", 404);
  }
  if (user.deleted_at !== null) {
    throw new HttpException("Account suspended or deleted", 403);
  }
  const now = Date.now();
  const accessExpires = new Date(now + 60 * 60 * 1000);
  const refreshExpires = new Date(now + 7 * 24 * 60 * 60 * 1000);
  const access = jwt.sign(
    {
      type: "user",
      id: user.id,
      session_id: decoded.session_id,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refresh = jwt.sign(
    {
      type: "user",
      id: user.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  await MyGlobal.prisma.todo_list_user_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpires },
  });
  return {
    id: user.id,
    email: user.email,
    display_name: user.display_name,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at:
      user.deleted_at === null || user.deleted_at === undefined
        ? undefined
        : toISOStringSafe(user.deleted_at),
    token: {
      access,
      refresh,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
