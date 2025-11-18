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
  let payload: { id: string; session_id: string; type: "user" };
  try {
    payload = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as { id: string; session_id: string; type: "user" };
  } catch (err) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  if (payload.type !== "user") {
    throw new HttpException("Invalid token type", 403);
  }

  const session = await MyGlobal.prisma.todo_user_sessions.findFirst({
    where: {
      id: payload.session_id,
      todo_user_id: payload.id,
    },
    include: {
      user: true,
    },
  });

  if (!session || !session.user) {
    throw new HttpException("Account not found or deleted", 403);
  }

  const now = Date.now();
  const accessExpires = now + 60 * 60 * 1000;
  const refreshExpires = now + 7 * 24 * 60 * 60 * 1000;

  const accessToken = jwt.sign(
    {
      type: "user",
      id: payload.id,
      session_id: payload.session_id,
      created_at: toISOStringSafe(new Date(now)),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "user",
      id: payload.id,
      session_id: payload.session_id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date(now)),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  await MyGlobal.prisma.todo_user_sessions.update({
    where: { id: payload.session_id },
    data: { expired_at: toISOStringSafe(new Date(refreshExpires)) },
  });

  return {
    id: session.user.id,
    email: session.user.email,
    created_at: toISOStringSafe(session.user.created_at),
    updated_at: toISOStringSafe(session.user.updated_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(new Date(accessExpires)),
      refreshable_until: toISOStringSafe(new Date(refreshExpires)),
    },
  };
}
