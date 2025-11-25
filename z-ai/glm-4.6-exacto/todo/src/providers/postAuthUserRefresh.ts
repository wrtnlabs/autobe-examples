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
  let decoded: { id: string; session_id: string; type: "user" };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as { id: string; session_id: string; type: "user" };
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (decoded.type !== "user") {
    throw new HttpException("Invalid token type", 403);
  }
  const sessionWithUser =
    await MyGlobal.prisma.todo_app_user_sessions.findFirst({
      where: {
        id: decoded.session_id,
        user_id: decoded.id,
      },
      include: {
        user: true,
      },
    });
  if (!sessionWithUser) {
    throw new HttpException("Session expired or revoked", 401);
  }
  if (sessionWithUser.user.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  const now = Date.now();
  const accessExpires = now + 60 * 60 * 1000; // 1 hour
  const refreshExpires = now + 7 * 24 * 60 * 60 * 1000; // 7 days
  const accessToken = jwt.sign(
    {
      type: "user",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: toISOStringSafe(new Date(now)),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );
  const refreshToken = jwt.sign(
    {
      type: "user",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date(now)),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  await MyGlobal.prisma.todo_app_user_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: new Date(refreshExpires) },
  });
  const user = sessionWithUser.user;
  return {
    id: user.id,
    email: user.email,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at:
      user.deleted_at !== null ? toISOStringSafe(user.deleted_at) : undefined,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(new Date(accessExpires)),
      refreshable_until: toISOStringSafe(new Date(refreshExpires)),
    },
  };
}
