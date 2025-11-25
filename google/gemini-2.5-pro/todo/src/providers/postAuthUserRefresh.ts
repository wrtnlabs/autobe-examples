import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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
  let decoded: { id: string; session_id: string; type: string };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as { id: string; session_id: string; type: string };
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (decoded.type !== "user") {
    throw new HttpException("Invalid or mismatched token type", 403);
  }
  const session = await MyGlobal.prisma.todo_user_sessions.findFirst({
    where: {
      id: decoded.session_id,
      todo_user_id: decoded.id,
    },
  });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const user = await MyGlobal.prisma.todo_users.findUnique({
    where: { id: decoded.id },
  });
  if (!user) {
    throw new HttpException("Account not found", 404);
  }
  const now = Date.now();
  const accessExpires = now + 60 * 60 * 1000;
  const refreshExpires = now + 7 * 24 * 60 * 60 * 1000;
  const expired_at = toISOStringSafe(new Date(accessExpires));
  const refreshable_until = toISOStringSafe(new Date(refreshExpires));
  const access = jwt.sign(
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
  );
  const refresh = jwt.sign(
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
  );
  await MyGlobal.prisma.todo_user_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: new Date(refreshExpires) },
  });
  return {
    id: user.id,
    email: user.email,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    token: {
      access,
      refresh,
      expired_at,
      refreshable_until,
    },
  };
}
